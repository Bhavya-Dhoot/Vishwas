import { edgeOnly } from './edge-policy.mjs';

const templates = {
  English: {
    travel: 'Thank you for letting us know. The care team can discuss the travel difficulty with you and help you find a suitable appointment. Please tell the team a convenient time to contact you.',
    cost: 'Thank you for sharing this. The care team can connect you with the hospital help desk to discuss appointment costs and available support. Please tell the team when you can speak.',
    work: 'We understand that the appointment may clash with work. The care team can check the available appointment times with you. Please share a day or time that suits you.',
    caregiver: 'Thank you for letting us know. With your permission, the care team can coordinate the appointment with your chosen caregiver. Please tell the team when both of you are available.',
    language: 'The care team can help explain the appointment details in your preferred language. Please tell the team which language you would like to use.',
    booking: 'The care team can help check your appointment details and available slots. Please tell the team what needs to change; any new booking will be confirmed separately.',
    other: 'Thank you for your message. A member of the care team will review your request and help with the next administrative step. Please share a convenient time to contact you.'
  },
  Hindi: {
    travel: 'बताने के लिए धन्यवाद। देखभाल टीम यात्रा की परेशानी समझने और सुविधाजनक अपॉइंटमेंट ढूँढने में मदद कर सकती है। कृपया बताएँ कि आपसे बात करने का सही समय क्या है।',
    cost: 'अपनी परेशानी बताने के लिए धन्यवाद। अपॉइंटमेंट के खर्च और उपलब्ध सहायता के बारे में बात करने के लिए देखभाल टीम आपको अस्पताल के सहायता केंद्र से जोड़ सकती है। कृपया बात करने का सुविधाजनक समय बताएँ।',
    work: 'हम समझते हैं कि काम के कारण अपॉइंटमेंट पर आना मुश्किल हो सकता है। देखभाल टीम आपके साथ उपलब्ध समय देख सकती है। कृपया अपनी सुविधा का दिन या समय बताएँ।',
    caregiver: 'बताने के लिए धन्यवाद। आपकी अनुमति से देखभाल टीम आपके चुने हुए परिजन के साथ अपॉइंटमेंट का समय तय करने में मदद कर सकती है। कृपया दोनों के लिए सुविधाजनक समय बताएँ।',
    language: 'देखभाल टीम आपकी पसंद की भाषा में अपॉइंटमेंट की जानकारी समझाने में मदद कर सकती है। कृपया बताएँ कि आप किस भाषा में बात करना चाहेंगे।',
    booking: 'देखभाल टीम अपॉइंटमेंट की जानकारी और उपलब्ध समय देखने में मदद कर सकती है। कृपया बताएँ कि क्या बदलना है। नई बुकिंग की पुष्टि अलग से की जाएगी।',
    other: 'आपके संदेश के लिए धन्यवाद। देखभाल टीम का एक सदस्य आपके अनुरोध को देखकर अगला कदम समझाने में मदद करेगा। कृपया बात करने का सुविधाजनक समय बताएँ।'
  }
};

export function getAiMode() {
  if (edgeOnly()) return 'templates';
  return process.env.OPENAI_API_KEY?.trim() && process.env.OPENAI_MODEL?.trim() ? 'configured' : 'templates';
}

export async function generateAdministrativeDraft({ barrier, language }, options = {}) {
  if (!Object.hasOwn(templates, language) || !Object.hasOwn(templates[language], barrier)) {
    throw new Error('Choose an administrative barrier and a supported language. Medical questions require staff.');
  }
  const fallback = { text: templates[language][barrier], source: 'clinic_template' };
  if (edgeOnly()) return fallback;
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options.model ?? process.env.OPENAI_MODEL;
  if (!apiKey?.trim() || !model?.trim()) return fallback;
  const fetcher = options.fetcher ?? globalThis.fetch;
  try {
    const response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        model,
        store: false,
        instructions: 'Rewrite the supplied administrative clinic reply in plain, warm language. Preserve its meaning and requested language. Do not add clinical advice, urgency judgments, tests, diagnoses, appointments, contacts, prices, transport or financial promises. Do not claim an action has happened. The output is a draft that hospital staff must review. Return only the requested JSON.',
        input: JSON.stringify({ barrier, language, approvedReply: fallback.text }),
        max_output_tokens: 500,
        text: { format: {
          type: 'json_schema', name: 'administrative_reply', strict: true,
          schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false }
        } }
      })
    });
    if (!response.ok) return fallback;
    const body = await response.json();
    if (body.status && body.status !== 'completed') return fallback;
    const text = (body.output ?? []).filter(item => item.type === 'message')
      .flatMap(item => item.content ?? []).filter(item => item.type === 'output_text').map(item => item.text).join('');
    const parsed = JSON.parse(text);
    if (typeof parsed.text !== 'string' || !parsed.text.trim() || parsed.text.length > 1500) return fallback;
    return { text: parsed.text.trim(), source: 'openai' };
  } catch {
    // The local journey must remain usable during provider errors; staff still review the clinic template.
    return fallback;
  }
}
