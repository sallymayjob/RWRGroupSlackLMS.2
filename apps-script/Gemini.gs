function getGeminiApiKey_() {
  var key = getScriptProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error('Missing GEMINI_API_KEY');
  }
  return key;
}

function buildBrandReviewRequest_(lessonId, sourceText) {
  return {
    contents: [{
      role: 'user',
      parts: [{
        text: 'Review this LMS lesson content for brand compliance and return structured output. LessonID: ' + lessonId + '\n\n' + sourceText
      }]
    }],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        required: ['lesson_id', 'edited_content', 'flags', 'change_log'],
        properties: {
          lesson_id: { type: 'STRING' },
          edited_content: { type: 'STRING' },
          change_log: {
            type: 'ARRAY',
            items: { type: 'STRING' }
          },
          flags: {
            type: 'OBJECT',
            required: ['banned_words_found', 'hype_language_found', 'tone_aligned', 'formatting_ok'],
            properties: {
              banned_words_found: { type: 'BOOLEAN' },
              hype_language_found: { type: 'BOOLEAN' },
              tone_aligned: { type: 'BOOLEAN' },
              formatting_ok: { type: 'BOOLEAN' }
            }
          }
        }
      }
    }
  };
}

function submitGeminiBatchJob_(lessonId, sourceText) {
  var cfg = getRuntimeConfig();
  var apiKey = getGeminiApiKey_();
  var url = cfg.geminiApiBaseUrl + '/models/' + cfg.geminiModel + ':batchGenerateContent?key=' + encodeURIComponent(apiKey);
  var payload = {
    requests: [buildBrandReviewRequest_(lessonId, sourceText)]
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var body = safeJsonParse(response.getContentText(), {});
  if (response.getResponseCode() >= 300) {
    throw new Error('Gemini submit failed: ' + response.getResponseCode() + ' ' + response.getContentText());
  }
  if (!body.name) {
    throw new Error('Gemini submit missing operation name');
  }

  return body;
}

function getGeminiOperation_(operationName) {
  var cfg = getRuntimeConfig();
  var apiKey = getGeminiApiKey_();
  var url = cfg.geminiApiBaseUrl + '/' + operationName + '?key=' + encodeURIComponent(apiKey);
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true
  });
  if (response.getResponseCode() >= 300) {
    throw new Error('Gemini poll failed: ' + response.getResponseCode() + ' ' + response.getContentText());
  }
  return safeJsonParse(response.getContentText(), {});
}

function extractGeminiStructuredResult_(operationBody) {
  var result = operationBody && operationBody.response && operationBody.response.responses ? operationBody.response.responses[0] : null;
  var text = result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0] ? result.candidates[0].content.parts[0].text : '';
  var parsed = safeJsonParse(text, null);
  if (!parsed) {
    throw new Error('Gemini returned non-JSON response text');
  }
  return parsed;
}
