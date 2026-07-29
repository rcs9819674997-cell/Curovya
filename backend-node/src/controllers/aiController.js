const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * AI Symptom Checker using OpenAI
 */
const symptomCheck = asyncHandler(async (req, res) => {
  const { symptoms, age, gender, duration, notes } = req.body;

  const disclaimer = 'This is an AI-generated assessment and NOT a medical diagnosis. Please consult a licensed doctor for accurate medical advice.';

  const fallback = {
    possible_conditions: ['Unable to assess right now'],
    recommended_specialists: ['General Physician'],
    urgency: 'see_doctor_soon',
    advice: 'Please consult a general physician for a proper evaluation.',
    disclaimer,
  };

  if (!config.openaiApiKey) {
    logger.warn('OpenAI API key not configured, returning fallback response');
    return res.json({
      success: true,
      result: fallback,
    });
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: config.openaiApiKey });

    const systemMessage = `You are a careful medical triage assistant for a healthcare app in Nepal. Given symptoms, output STRICT JSON only with keys: possible_conditions (list of 2-4 plain-language condition names), recommended_specialists (list of 1-3 medical specialties), urgency (one of: self_care, see_doctor_soon, urgent, emergency), advice (2-3 sentences of safe generic guidance). Never diagnose. Never prescribe medicines. Do not include disclaimers in JSON.`;

    const userText = `Patient info: age=${age || 'unknown'}, gender=${gender || 'unknown'}, duration=${duration || 'unspecified'}\nSymptoms: ${symptoms.join(', ')}\nNotes: ${notes || 'none'}\n\nRespond with JSON only.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userText },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{.*\}/s);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const result = {
      possible_conditions: data.possible_conditions || fallback.possible_conditions,
      recommended_specialists: data.recommended_specialists || fallback.recommended_specialists,
      urgency: data.urgency || 'see_doctor_soon',
      advice: data.advice || fallback.advice,
      disclaimer,
    };

    logger.info('AI symptom check completed', { userId: req.user.sub, symptomsCount: symptoms.length });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('AI symptom check failed:', error);
    res.json({
      success: true,
      result: fallback,
    });
  }
});

module.exports = {
  symptomCheck,
};
