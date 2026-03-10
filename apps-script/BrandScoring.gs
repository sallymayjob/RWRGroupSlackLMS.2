function computeBrandComplianceScore(flags) {
  var score = 100;
  var deductions = [];

  if (flags.banned_words_found) {
    score -= 30;
    deductions.push('banned_words_found:-30');
  }
  if (flags.hype_language_found) {
    score -= 10;
    deductions.push('hype_language_found:-10');
  }
  if (!flags.tone_aligned) {
    score -= 20;
    deductions.push('tone_aligned:false:-20');
  }
  if (!flags.formatting_ok) {
    score -= 10;
    deductions.push('formatting_ok:false:-10');
  }

  if (score < 0) {
    score = 0;
  }

  return {
    score: score,
    deductions: deductions
  };
}
