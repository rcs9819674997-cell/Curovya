# Project specific ProGuard rules for Curovya Patient

# React Native & Hermes core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }

# Expo Modules
-keep class expo.modules.** { *; }

# Agora RTC SDK
-keep class io.agora.** { *; }

# Reanimated & Gesture Handler
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }

# Native UI & Navigation
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# Keep all native method declarations
-keepclasseswithmembernames class * {
    native <methods>;
}
