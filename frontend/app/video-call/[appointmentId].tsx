import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { loadAgora, isAgoraSupported, isExpoGo, isWeb, AgoraRtcModule } from "@/src/utils/agora";
import { colors, radius, spacing } from "@/src/theme";
import { useT } from "@/src/i18n";

interface VideoToken {
  app_id: string;
  channel: string;
  uid: number;
  role: string;
  token: string;
  expires_at: number;
  mock: boolean;
  appointment_id: string;
}

interface VideoStatus {
  appointment_id: string;
  mode: string;
  video_status: "not_started" | "doctor_ready" | "ended" | string;
  doctor_ready: boolean;
  ended: boolean;
}

// Global engine ref — Agora only allows one instance per process.
type RtcEngine = any; // typed as any because module may be null at compile time in Expo Go

export default function VideoCallScreen() {
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams<{ appointmentId: string }>();
  const appointmentId = params.appointmentId as string;
  const { user } = useAuth();

  const [status, setStatus] = useState<VideoStatus | null>(null);
  const [tokenInfo, setTokenInfo] = useState<VideoToken | null>(null);
  const [joined, setJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [swapCam, setSwapCam] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const engineRef = useRef<RtcEngine>(null);
  const agoraMod = useRef<AgoraRtcModule | null>(null);
  const isDoctor = user?.role === "doctor";

  // ---- load status --------------------------------------------------------
  const refreshStatus = async () => {
    try {
      const s = await api.get<VideoStatus>(`/video/appointment/${appointmentId}`);
      setStatus(s);
    } catch (e: any) {
      setErr(e?.detail || "Failed to load call status");
    }
  };
  useEffect(() => {
    refreshStatus();
    const iv = setInterval(refreshStatus, 5000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  // ---- initialize Agora engine on demand ----------------------------------
  const initEngine = (mod: AgoraRtcModule): RtcEngine => {
    const { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } = mod as any;
    const eng = createAgoraRtcEngine();
    eng.initialize({
      appId: tokenInfo?.app_id || "",
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    });
    eng.registerEventHandler({
      onJoinChannelSuccess: () => setJoined(true),
      onUserJoined: (_conn: any, uid: number) => setRemoteUid(uid),
      onUserOffline: () => setRemoteUid(null),
      onLeaveChannel: () => {
        setJoined(false);
        setRemoteUid(null);
      },
      onError: (errCode: number, msg: string) => setErr(`Agora error ${errCode}: ${msg}`),
    });
    eng.enableVideo();
    eng.setClientRole(ClientRoleType.ClientRoleBroadcaster);
    eng.startPreview();
    return eng;
  };

  // ---- start / join --------------------------------------------------------
  const startOrJoin = async () => {
    setErr(null);
    setBusy(true);
    try {
      // Doctor: mark ready first.
      if (isDoctor && status?.video_status !== "doctor_ready") {
        await api.post("/video/start", { appointment_id: appointmentId });
      }
      const tok = await api.post<VideoToken>("/video/token", { appointment_id: appointmentId });
      setTokenInfo(tok);

      if (!isAgoraSupported()) {
        // Preview / Expo Go: don't try to init native module.
        setBusy(false);
        return;
      }

      const mod = loadAgora();
      if (!mod) {
        setBusy(false);
        return;
      }
      agoraMod.current = mod;

      if (tok.mock || !tok.app_id) {
        setErr("Video calling is in placeholder mode. Ask the admin to configure AGORA_APP_ID + AGORA_APP_CERTIFICATE in the backend .env.");
        setBusy(false);
        return;
      }

      // Real Agora path — dev/standalone build only.
      const engine = initEngine(mod);
      engineRef.current = engine;
      engine.joinChannel(tok.token, tok.channel, tok.uid, {});
      await refreshStatus();
    } catch (e: any) {
      setErr(e?.detail || e?.message || "Failed to start call");
    } finally {
      setBusy(false);
    }
  };

  // ---- end -----------------------------------------------------------------
  const endCall = async () => {
    try {
      const eng = engineRef.current;
      if (eng) {
        eng.leaveChannel();
        eng.release();
        engineRef.current = null;
      }
    } catch {}
    setJoined(false);
    setRemoteUid(null);
    try {
      await api.post("/video/end", { appointment_id: appointmentId });
    } catch {}
    router.back();
  };

  useEffect(() => () => {
    const eng = engineRef.current;
    if (eng) {
      try { eng.leaveChannel(); eng.release(); } catch {}
      engineRef.current = null;
    }
  }, []);

  const toggleMic = () => {
    setMicOn(v => {
      const nv = !v;
      engineRef.current?.muteLocalAudioStream?.(!nv);
      return nv;
    });
  };
  const toggleCam = () => {
    setCamOn(v => {
      const nv = !v;
      engineRef.current?.muteLocalVideoStream?.(!nv);
      return nv;
    });
  };
  const flipCam = () => {
    setSwapCam(v => !v);
    engineRef.current?.switchCamera?.();
  };

  // ---- UI ------------------------------------------------------------------

  // Fallback: Expo Go or web
  if (isExpoGo() || isWeb()) {
    return (
      <SafeAreaView style={styles.wrap} edges={["top", "bottom"]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} testID="vc-back">
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.center}>
          <View style={styles.fallbackIcon}>
            <Ionicons name="videocam" size={44} color="#FDE047" />
          </View>
          <Text style={styles.h1}>{t("video_consultation") || "Video Consultation"}</Text>
          <Text style={styles.fallbackTxt}>
            Video calls need the native Curovya app.{"\n"}
            Please download the mobile app or a development build.
          </Text>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.infoTxt}>Powered by Agora RTC · doctor-patient private channel</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.dismissBtn} testID="vc-dismiss">
            <Text style={styles.dismissTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const waitingForDoctor = !isDoctor && !status?.doctor_ready;
  const hasJoinedButNoRemote = joined && remoteUid == null;

  return (
    <SafeAreaView style={styles.wrap} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={endCall} style={styles.back} testID="vc-back">
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.hTitle}>{isDoctor ? "Video Consultation" : "Doctor Consult"}</Text>
          {joined ? (
            <View style={styles.liveDot}><View style={styles.dotAnim} /><Text style={styles.liveTxt}>Live</Text></View>
          ) : status?.doctor_ready ? (
            <Text style={styles.hSub}>Doctor is ready</Text>
          ) : (
            <Text style={styles.hSub}>Not started</Text>
          )}
        </View>
        <View style={{ width: 26 }} />
      </View>

      {/* Video area */}
      <View style={styles.videoArea} testID="vc-video-area">
        {joined && agoraMod.current ? (
          <>
            {/* Remote view */}
            {remoteUid != null ? (
              <AgoraRemoteView mod={agoraMod.current} uid={remoteUid} channel={tokenInfo!.channel} />
            ) : (
              <View style={styles.remotePlaceholder}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.placeholderTxt}>
                  {isDoctor ? "Waiting for patient to join…" : "Connecting to doctor…"}
                </Text>
              </View>
            )}
            {/* Local preview */}
            <View style={styles.localBox}>
              {camOn ? (
                <AgoraLocalView mod={agoraMod.current} />
              ) : (
                <View style={styles.camOff}>
                  <Ionicons name="videocam-off" size={20} color="#fff" />
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.remotePlaceholder}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="rgba(255,255,255,0.5)" />
            </View>
            <Text style={styles.placeholderTxt}>
              {waitingForDoctor ? "Waiting for doctor to start the call…" : "Ready to connect"}
            </Text>
            {tokenInfo?.mock ? (
              <View style={styles.mockBadge}>
                <Ionicons name="flask-outline" size={12} color="#FDE047" />
                <Text style={styles.mockTxt}>Placeholder mode · configure Agora keys</Text>
              </View>
            ) : null}
          </View>
        )}

        {hasJoinedButNoRemote ? null : null}
      </View>

      {/* Error banner */}
      {err ? (
        <View style={styles.errBox} testID="vc-error">
          <Ionicons name="warning" size={14} color={colors.error} />
          <Text style={styles.errTxt}>{err}</Text>
        </View>
      ) : null}

      {/* Controls */}
      <View style={styles.controls}>
        {joined ? (
          <>
            <ControlBtn icon={micOn ? "mic" : "mic-off"} bg={micOn ? "rgba(255,255,255,0.14)" : "#B91C1C"} onPress={toggleMic} testID="vc-mic" />
            <ControlBtn icon="camera-reverse" bg="rgba(255,255,255,0.14)" onPress={flipCam} testID="vc-flip" />
            <TouchableOpacity onPress={endCall} style={styles.endBtn} testID="vc-end">
              <Ionicons name="call" size={26} color="#fff" />
            </TouchableOpacity>
            <ControlBtn icon={camOn ? "videocam" : "videocam-off"} bg={camOn ? "rgba(255,255,255,0.14)" : "#B91C1C"} onPress={toggleCam} testID="vc-cam" />
            <ControlBtn icon="chatbubbles" bg="rgba(255,255,255,0.14)" onPress={() => setErr("Chat is coming soon.")} testID="vc-chat" />
          </>
        ) : (
          <TouchableOpacity
            onPress={startOrJoin}
            disabled={busy || waitingForDoctor}
            style={[styles.joinBtn, waitingForDoctor && { opacity: 0.5 }]}
            testID="vc-start-join"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="videocam" size={20} color="#fff" />
                <Text style={styles.joinTxt}>
                  {isDoctor ? "Start Consultation" : waitingForDoctor ? "Waiting for doctor…" : "Join Consultation"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function ControlBtn({ icon, bg, onPress, testID }: { icon: keyof typeof Ionicons.glyphMap; bg: string; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.ctrlBtn, { backgroundColor: bg }]} testID={testID}>
      <Ionicons name={icon} size={22} color="#fff" />
    </TouchableOpacity>
  );
}

function AgoraLocalView({ mod }: { mod: AgoraRtcModule }) {
  const { RtcSurfaceView, VideoSourceType } = mod as any;
  return (
    <RtcSurfaceView
      canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
      style={StyleSheet.absoluteFill}
    />
  );
}

function AgoraRemoteView({ mod, uid, channel }: { mod: AgoraRtcModule; uid: number; channel: string }) {
  const { RtcSurfaceView } = mod as any;
  return (
    <RtcSurfaceView
      canvas={{ uid, channelId: channel }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0A0A0A" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  hTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  hSub: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 },
  liveDot: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  dotAnim: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" },
  liveTxt: { color: "#EF4444", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  videoArea: { flex: 1, backgroundColor: "#111", overflow: "hidden" },
  remotePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  placeholderTxt: { color: "rgba(255,255,255,0.7)", fontSize: 14, textAlign: "center", marginTop: 12 },
  mockBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20, backgroundColor: "rgba(253,224,71,0.12)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  mockTxt: { color: "#FDE047", fontSize: 11, fontWeight: "700" },
  localBox: { position: "absolute", top: 12, right: 12, width: 110, height: 150, backgroundColor: "#1F2937", borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  camOff: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1F2937" },
  errBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(220,38,38,0.15)", padding: 10, marginHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(220,38,38,0.4)" },
  errTxt: { color: "#FCA5A5", fontSize: 12, flex: 1 },
  controls: { flexDirection: "row", justifyContent: "center", alignItems: "center", padding: spacing.lg, gap: 16 },
  ctrlBtn: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  endBtn: { width: 66, height: 66, borderRadius: 33, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", transform: [{ rotate: "135deg" }] },
  joinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.primary, paddingHorizontal: 20, height: 54, borderRadius: 999, minWidth: 260 },
  joinTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  // Fallback (Expo Go / web)
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  fallbackIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(253,224,71,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  h1: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center" },
  fallbackTxt: { color: "rgba(255,255,255,0.7)", fontSize: 15, textAlign: "center", marginTop: 12, lineHeight: 22 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 24 },
  infoTxt: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  dismissBtn: { marginTop: 32, backgroundColor: colors.primary, paddingHorizontal: 28, height: 48, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  dismissTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
