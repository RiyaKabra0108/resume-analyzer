/**
 * Resume Analyzer Module
 * Handles local scoring heuristics, job description keyword matching,
 * and client-side Gemini API REST integration.
 */

// Simple dictionary of common English stop words to filter out during JD keyword parsing
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
  'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an',
  'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about',
  'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up',
  'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
]);

/**
 * Perform job description parsing and extract standard skills
 * @param {string} jdText 
 * @returns {array} Flat array of identified skills
 */
function parseJobDescriptionSkills(jdText) {
  if (!jdText) return [];
  const lowerJD = jdText.toLowerCase();
  const foundSkills = [];

  // Import dictionary from window if running in browser, or require locally
  let skillsDict = {};
  if (typeof window !== 'undefined' && window.ResumePreprocessor) {
    skillsDict = window.ResumePreprocessor.SKILLS_DICTIONARY;
  } else if (typeof require !== 'undefined') {
    const { SKILLS_DICTIONARY } = require('./preprocessor.js');
    skillsDict = SKILLS_DICTIONARY;
  }

  for (let category in skillsDict) {
    for (let skill of skillsDict[category]) {
      const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      let regex;
      if (skill === 'go' || skill === 'r') {
        regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
      } else {
        regex = new RegExp(`\\b${escapedSkill}\\b|\\b${escapedSkill}s\\b`, 'i');
      }
      
      if (regex.test(lowerJD)) {
        foundSkills.push(skill);
      }
    }
  }

  // Deduplicate
  return [...new Set(foundSkills)];
}

/**
 * Calculate scores based on the preprocessed resume and target Job Description
 * @param {object} preprocessedData 
 * @param {string} jdText 
 * @returns {object} Highly detailed breakdown scores and matching metrics
 */
function evaluateResume(preprocessedData, jdText = '') {
  const scores = {
    overall: 0,
    formatting: 100,
    bullets: 0,
    skills: 0,
    completeness: 100,
    skillsMatchPercent: 0,
    skillGaps: [],
    matchedJdSkills: []
  };

  const sections = preprocessedData.sections;
  const warnings = preprocessedData.warnings;
  const bullets = preprocessedData.bullets;
  const skills = preprocessedData.skills;

  // 1. Core Section Completeness (30% weight in baseline overall)
  // Deduct 25 points for missing Experience or Education, 20 for Skills, 10 for Summary/Projects
  if (!sections.experience || sections.experience.length < 20) {
    scores.completeness -= 30;
  }
  if (!sections.education || sections.education.length < 20) {
    scores.completeness -= 25;
  }
  if (!sections.skills || sections.skills.length < 10) {
    scores.completeness -= 25;
  }
  if (!sections.summary || sections.summary.length < 10) {
    scores.completeness -= 10;
  }
  if (!sections.projects || sections.projects.length < 10) {
    scores.completeness -= 10;
  }
  scores.completeness = Math.max(0, scores.completeness);

  // 2. Formatting Score (20% weight in baseline overall)
  // Deduct based on warnings severity
  warnings.forEach(warning => {
    if (warning.severity === 'high') {
      scores.formatting -= 15;
    } else if (warning.severity === 'medium') {
      scores.formatting -= 8;
    }
  });
  scores.formatting = Math.max(0, scores.formatting);

  // 3. Bullet points score (30% weight in baseline overall)
  if (bullets.length > 0) {
    const totalBulletScore = bullets.reduce((sum, b) => sum + b.score, 0);
    scores.bullets = Math.round(totalBulletScore / bullets.length);
  } else {
    // If no bullets were successfully analyzed
    scores.bullets = sections.experience ? 40 : 0;
  }

  // 4. Local Skill Score (20% weight in baseline overall)
  // Evaluates skill count & density
  const skillCount = skills.count;
  const skillDensity = skills.density;
  
  let skillScore = 40; // baseline
  if (skillCount > 5) skillScore += 20;
  if (skillCount > 12) skillScore += 20;
  if (skillDensity >= 1.5 && skillDensity <= 5) skillScore += 20;
  else if (skillDensity > 5) skillScore += 10; // too dense, keyword stuffing warning
  
  scores.skills = Math.min(100, skillScore);

  // 5. Job Description Skills Match Comparison
  if (jdText.trim().length > 0) {
    const jdSkills = parseJobDescriptionSkills(jdText);
    scores.matchedJdSkills = jdSkills;
    
    if (jdSkills.length > 0) {
      const resumeSkillsSet = new Set(skills.flatList.map(s => s.toLowerCase()));
      const matchingSkills = jdSkills.filter(s => resumeSkillsSet.has(s.toLowerCase()));
      
      scores.skillsMatchPercent = Math.round((matchingSkills.length / jdSkills.length) * 100);
      scores.skillGaps = jdSkills.filter(s => !resumeSkillsSet.has(s.toLowerCase()));
    } else {
      // Job description had text, but no recognizable skills matches.
      scores.skillsMatchPercent = 0;
      scores.skillGaps = [];
    }
  }

  // 6. Overall ATS Score synthesis
  // Heuristic weights: 30% Completeness, 20% Formatting, 30% Bullets, 20% Skill Density.
  // If a JD is provided, we weave in the matching score: 70% of base + 30% of JD Match.
  const baseOverall = Math.round(
    (scores.completeness * 0.3) +
    (scores.formatting * 0.2) +
    (scores.bullets * 0.3) +
    (scores.skills * 0.2)
  );

  if (jdText.trim().length > 0 && scores.matchedJdSkills.length > 0) {
    scores.overall = Math.round((baseOverall * 0.7) + (scores.skillsMatchPercent * 0.3));
  } else {
    scores.overall = baseOverall;
  }

  return scores;
}

/**
 * Call client-side Gemini API REST endpoint using fetch
 * @param {string} apiKey - Gemini API Key provided by user
 * @param {object} preprocessed - Complete preprocessed resume package
 * @param {string} targetJd - Target job description text
 * @returns {Promise<object>} Parsed recommendations JSON from AI
 */
async function generateAIPredictions(apiKey, preprocessed, targetJd = '') {
  if (!apiKey) throw new Error('Gemini API key is required.');

  // Create clean structural snapshot of resume details to minimize context tokens
  const resumeSnapshot = {
    name: preprocessed.contact.name,
    summary: preprocessed.sections.summary,
    skills: preprocessed.skills.flatList,
    experience_bullets: preprocessed.bullets.map(b => b.text).slice(0, 10), // Limit to top 10 bullets
    education: preprocessed.sections.education
  };

  const systemInstructions = `
You are an expert ATS (Applicant Tracking System) parser and Executive Resume Consultant.
Analyze the provided resume and job description (if specified) and output a highly actionable optimization plan.

Return your complete response in structured JSON format following this exact schema:
{
  "summary": "2-3 sentences general assessment of the candidate profile",
  "bulletPointImprovements": [
    {
      "original": "The original bullet point from the experience list",
      "revised": "A strong, results-oriented rewrite using the STAR method (Action + Context + Metric/Result)",
      "rationale": "Brief reason why this rewrite is better (e.g., added impact verb, added metric)"
    }
  ],
  "structuralFixes": [
    "List of critical formatting, header, or section fixes needed for standard ATS systems"
  ],
  "tailoredSkillsToAcquire": [
    "List of missing keywords, certifications, or technologies needed to align with the target job"
  ],
  "interviewQuestions": [
    "2 behavioral interview questions tailored to the gaps found between the resume and job description"
  ]
}

Ensure that bulletPointImprovements has at least 3-4 items, choosing from the experience bullets.
Do NOT output any markdown tags or markdown code block surrounds around the JSON. Return pure raw JSON string content.
`;

  const userPrompt = `
RESUME DETAILS:
${JSON.stringify(resumeSnapshot, null, 2)}

TARGET JOB DESCRIPTION (IF SPECIFIED):
${targetJd || 'Not specified. Analyze general software/professional alignment.'}
`;

  // Fetch from the official REST API endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: systemInstructions },
          { text: userPrompt }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errMsg = errorBody.error?.message || `HTTP error ${response.status}`;
    throw new Error(`Gemini API Error: ${errMsg}`);
  }

  const jsonResponse = await response.json();
  const textContent = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textContent) {
    throw new Error('Empty response received from the AI model.');
  }

  try {
    return JSON.parse(textContent);
  } catch (err) {
    console.error('Failed to parse AI output as JSON:', textContent);
    // Fallback parser if formatting wraps JSON
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('AI response is not in a valid JSON format.');
  }
}

// Export for Node.js if available, or attach to window for browser client
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseJobDescriptionSkills,
    evaluateResume,
    generateAIPredictions
  };
} else {
  window.ResumeAnalyzer = {
    parseJobDescriptionSkills,
    evaluateResume,
    generateAIPredictions
  };
}
