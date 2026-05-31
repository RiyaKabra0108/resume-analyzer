/**
 * Resume Preprocessor Module
 * Highly robust text extraction cleaner, segmenter, and analyzer.
 * Works entirely client-side or in Node.js environments.
 */

// Skills Dictionary for ATS Skill density and matching
const SKILLS_DICTIONARY = {
  frontend: ['react', 'vue', 'angular', 'svelte', 'javascript', 'typescript', 'html', 'html5', 'css', 'css3', 'sass', 'less', 'tailwind', 'bootstrap', 'webpack', 'vite', 'next.js', 'nuxt.js', 'gatsby', 'redux', 'mobx', 'jquery'],
  backend: ['node.js', 'node', 'express', 'koa', 'nestjs', 'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'spring boot', 'go', 'golang', 'rust', 'c++', 'c#', 'dotnet', '.net', 'ruby', 'rails', 'php', 'laravel', 'graphql', 'apollo'],
  database: ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'mongodb', 'mongoose', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'oracle', 'firebase', 'firestore', 'supabase'],
  devops: ['aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'jenkins', 'github actions', 'gitlab ci', 'terraform', 'ansible', 'nginx', 'apache', 'linux', 'bash', 'yaml'],
  dataScience: ['pandas', 'numpy', 'scipy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'r', 'data science', 'machine learning', 'deep learning', 'nlp', 'computer vision', 'tableau', 'power bi', 'spark', 'hadoop'],
  management: ['agile', 'scrum', 'kanban', 'jira', 'confluence', 'product management', 'project management', 'leadership', 'team management', 'budgets', 'sdlc', 'product roadmap'],
  soft: ['communication', 'teamwork', 'collaboration', 'problem solving', 'critical thinking', 'time management', 'adaptability', 'mentorship', 'negotiation', 'creativity', 'empathy']
};

// Common ATS Impact/Action Verbs
const IMPACT_VERBS = [
  'led', 'managed', 'developed', 'designed', 'optimized', 'built', 'created', 'researched', 'launched',
  'engineered', 'refactored', 'automated', 'analyzed', 'collaborated', 'spearheaded', 'implemented',
  'increased', 'decreased', 'reduced', 'improved', 'saved', 'generated', 'solved', 'accelerated',
  'achieved', 'delivered', 'expanded', 'formulated', 'headed', 'maximized', 'overhauled', 'pioneered',
  'structured', 'transformed', 'upgraded', 'established', 'coordinated', 'initiated', 'executed'
];

/**
 * Clean raw text extracted from PDF or Word files
 * @param {string} text 
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  if (!text) return '';
  
  return text
    // Replace non-breaking spaces and tabs with standard space
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\ufeff]/g, ' ')
    .replace(/\t/g, ' ')
    // Standardize quotes and hyphens
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // Clean carriage returns, consolidate spaces
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove sequences of three or more spaces (keep newlines)
    .replace(/[ ]{3,}/g, '  ')
    // Strip control characters but keep common punctuation/newlines
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .trim();
}

/**
 * Extract contact information using advanced heuristics & regexes
 * @param {string} text - The raw cleaned text of the resume
 * @returns {object} Extracted contact fields
 */
function extractContactInfo(text) {
  const info = {
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    website: '',
    location: ''
  };

  if (!text) return info;

  // Split into lines for local inspection
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1. Email Regex
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) info.email = emailMatch[1].trim();

  // 2. Phone Regex (supports US, UK, international formats)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) info.phone = phoneMatch[0].trim();

  // 3. Social & Portfolio links
  const linkedinRegex = /(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i;
  const githubRegex = /(github\.com\/[a-zA-Z0-9_-]+)/i;
  const webRegex = /((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

  const liMatch = text.match(linkedinRegex);
  if (liMatch) info.linkedin = liMatch[1].trim();

  const ghMatch = text.match(githubRegex);
  if (ghMatch) info.github = ghMatch[1].trim();

  // Website extraction: find links that aren't email, LinkedIn, or GitHub
  let webMatches = text.match(webRegex) || [];
  for (let match of webMatches) {
    const isEmail = match.includes('@');
    const isLi = match.toLowerCase().includes('linkedin.com');
    const isGh = match.toLowerCase().includes('github.com');
    if (!isEmail && !isLi && !isGh) {
      info.website = match.trim();
      break;
    }
  }

  // 4. Name Heuristic (Usually the first non-empty line of the resume,
  // provided it doesn't contain email, phone, or standard contact keyword)
  const avoidKeywords = ['email', 'phone', 'contact', 'resume', 'cv', 'linkedin', 'github', 'address', 'portfolio', 'curriculum'];
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    const containsAvoid = avoidKeywords.some(keyword => line.toLowerCase().includes(keyword));
    const containsEmail = emailRegex.test(line);
    const containsPhone = phoneRegex.test(line);
    
    // Check if line length is reasonable for a name (2 to 4 words, 5-40 chars)
    const wordCount = line.split(/\s+/).length;
    if (!containsAvoid && !containsEmail && !containsPhone && wordCount >= 2 && wordCount <= 5 && line.length < 50) {
      info.name = line;
      break;
    }
  }

  // 5. Location Heuristic (Look for City, ST or City, Country pattern in header lines)
  const locRegex = /([A-Z][a-zA-Z\s]+,?\s+[A-Z]{2}\b|[A-Z][a-zA-Z\s]+,?\s+[A-Z][a-zA-Z\s]+)/;
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i];
    if (line.includes(info.name) || emailRegex.test(line) || phoneRegex.test(line)) {
      const match = line.match(locRegex);
      if (match && !match[0].toLowerCase().includes('phone') && !match[0].toLowerCase().includes('email')) {
        info.location = match[0].trim();
        break;
      }
    }
  }

  return info;
}

/**
 * Segment the resume text into standard sections based on regex header maps
 * @param {string} text 
 * @returns {object} Map of section names to parsed text blocks
 */
function segmentResume(text) {
  const sections = {
    header: '',
    summary: '',
    experience: '',
    education: '',
    skills: '',
    projects: '',
    certifications: '',
    other: ''
  };

  if (!text) return sections;

  // Header regex patterns (anchored to line starts or standing alone)
  const headerMap = {
    summary: /^(?:professional\s+)?summary|objective|career\s+objective|professional\s+profile|about\s+me$/i,
    experience: /^(?:work\s+|professional\s+|employment\s+)?experience|employment\s+history|work\s+history|professional\s+background$/i,
    education: /^education|academic\s+background|academic\s+history|educational\s+qualifications$/i,
    skills: /^skills|technical\s+skills|core\s+competencies|areas\s+of\s+expertise|technologies|skills\s+&\s+technologies$/i,
    projects: /^projects|key\s+projects|personal\s+projects|academic\s+projects|technical\s+projects$/i,
    certifications: /^certifications|licenses|awards|honors|publications|languages$/i
  };

  const lines = text.split('\n');
  let currentSection = 'header';
  let sectionBuffers = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    other: []
  };

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // Check if this line matches a key section header
    let matchedSection = null;
    for (let secName in headerMap) {
      if (headerMap[secName].test(trimmed)) {
        matchedSection = secName;
        break;
      }
    }

    if (matchedSection) {
      currentSection = matchedSection;
    } else {
      sectionBuffers[currentSection].push(line);
    }
  }

  // Combine line buffers into section strings
  for (let secName in sections) {
    sections[secName] = sectionBuffers[secName].join('\n').trim();
  }

  return sections;
}

/**
 * Analyse a single bullet point or sentence for ATS compliance
 * @param {string} bullet 
 * @returns {object} Feedback metrics on the bullet point
 */
function analyzeBulletPoint(bullet) {
  const result = {
    text: bullet,
    wordCount: 0,
    hasImpactVerb: false,
    matchedVerb: '',
    hasMetric: false,
    matchedMetric: '',
    score: 0,
    suggestions: []
  };

  if (!bullet) return result;

  const words = bullet.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  result.wordCount = words.length;

  // 1. Word Count rating
  if (result.wordCount < 6) {
    result.suggestions.push('Too short. Add more context or explain the result of your action.');
  } else if (result.wordCount > 25) {
    result.suggestions.push('Too wordy. Condense this bullet to make it punchy and easily readable.');
  }

  // 2. Action Verb Check (typically first 1-2 words of the bullet)
  const firstFewWords = words.slice(0, 3);
  for (let verb of IMPACT_VERBS) {
    if (firstFewWords.includes(verb)) {
      result.hasImpactVerb = true;
      result.matchedVerb = verb;
      break;
    }
  }

  if (!result.hasImpactVerb) {
    // Check if impact verb is present anywhere in the bullet
    for (let verb of IMPACT_VERBS) {
      if (words.includes(verb)) {
        result.hasImpactVerb = true;
        result.matchedVerb = verb;
        result.suggestions.push('Action verb found, but it is not at the start. Lead with the action verb for higher impact.');
        break;
      }
    }
    
    if (!result.hasImpactVerb) {
      result.suggestions.push('Missing a strong action verb (e.g., "Led", "Optimized", "Designed"). Start the bullet with one.');
    }
  }

  // 3. Metric / Quantification Check
  // Matches percentages (e.g. 50%), counts (e.g. 10x, 40+), values (e.g. $5K, 2.5M), or raw numbers.
  const metricRegex = /(\b\d+(?:\.\d+)?%|\b\d+\s*(?:x|times)\b|[$£€]\d+(?:\.\d+)?[KMBkmb]?|\b\d{2,}\+?\b)/;
  const metricMatch = bullet.match(metricRegex);
  
  if (metricMatch) {
    result.hasMetric = true;
    result.matchedMetric = metricMatch[0];
  } else {
    result.suggestions.push('Lacks quantitative results. Try to include a metric (e.g., "increased speed by 25%", "managed $10k budget").');
  }

  // 4. Calculate Score
  let score = 40; // baseline
  if (result.wordCount >= 6 && result.wordCount <= 25) score += 20;
  if (result.hasImpactVerb) score += 20;
  if (result.hasMetric) score += 20;

  result.score = score;
  return result;
}

/**
 * Extract lists of skills matched from the dictionary
 * @param {string} text 
 * @returns {object} Extracted categorized skills and metrics
 */
function extractSkills(text) {
  const result = {
    categorized: {},
    flatList: [],
    density: 0, // skills / total words
    count: 0
  };

  if (!text) return result;

  const lowerText = text.toLowerCase();
  // Simple word count to calculate skill density
  const totalWords = lowerText.split(/\s+/).filter(w => w.length > 0).length;

  for (let category in SKILLS_DICTIONARY) {
    result.categorized[category] = [];
    
    for (let skill of SKILLS_DICTIONARY[category]) {
      // Use regex with word boundary to avoid matching "go" inside "google"
      // Escape special characters in skills like node.js, .net, c++
      const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      let regex;
      if (skill === 'go' || skill === 'r') {
        // Strict boundary for single characters / short words
        regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
      } else {
        regex = new RegExp(`\\b${escapedSkill}\\b|\\b${escapedSkill}s\\b`, 'i');
      }

      if (regex.test(lowerText)) {
        result.categorized[category].push(skill);
        result.flatList.push(skill);
      }
    }
  }

  result.count = result.flatList.length;
  result.density = totalWords > 0 ? parseFloat(((result.count / totalWords) * 100).toFixed(2)) : 0;

  return result;
}

/**
 * Perform comprehensive structural validation to warn about ATS parsing blockers
 * @param {object} segmented 
 * @param {string} rawText 
 * @returns {array} List of warning objects
 */
function checkATSWarnings(segmented, rawText) {
  const warnings = [];
  const contact = extractContactInfo(rawText);

  // 1. Missing Core Sections
  if (!segmented.experience || segmented.experience.length < 20) {
    warnings.push({
      type: 'missing_section',
      severity: 'high',
      title: 'Experience Section Missing',
      message: 'ATS parsers look specifically for work experience. Ensure you use standard headers like "Work Experience" or "Professional History".'
    });
  }

  if (!segmented.skills || segmented.skills.length < 10) {
    warnings.push({
      type: 'missing_section',
      severity: 'medium',
      title: 'Skills Section Missing or Sparse',
      message: 'Many ATS systems rank candidates based on keyword matching in the skills block. Explicitly define a "Skills" section.'
    });
  }

  if (!segmented.education || segmented.education.length < 10) {
    warnings.push({
      type: 'missing_section',
      severity: 'high',
      title: 'Education Section Missing',
      message: 'Education is a key parsing filter. Make sure you list your academic background under an "Education" header.'
    });
  }

  // 2. Missing Core Contact Details
  if (!contact.name) {
    warnings.push({
      type: 'missing_contact',
      severity: 'high',
      title: 'Name Not Identified',
      message: 'Ensure your name is clearly printed at the very top of the document in a clean, readable font.'
    });
  }

  if (!contact.email) {
    warnings.push({
      type: 'missing_contact',
      severity: 'high',
      title: 'Email Address Missing',
      message: 'Employers and ATS parsers cannot contact you. Provide a clear, standard email address (e.g., name@domain.com).'
    });
  }

  if (!contact.phone) {
    warnings.push({
      type: 'missing_contact',
      severity: 'medium',
      title: 'Phone Number Missing',
      message: 'It is highly recommended to include a phone number for direct contact.'
    });
  }

  // 3. Document Length Check
  const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 200) {
    warnings.push({
      type: 'formatting',
      severity: 'high',
      title: 'Resume Content Too Sparse',
      message: `Your resume contains only ${wordCount} words. Standard resumes should be at least 400 words to provide meaningful professional details.`
    });
  } else if (wordCount > 1500) {
    warnings.push({
      type: 'formatting',
      severity: 'medium',
      title: 'Resume Content Too Lengthy',
      message: `Your resume contains ${wordCount} words, which may indicate it exceeds the standard 1-2 page layout. Try to condense your content to under 1000 words.`
    });
  }

  // 4. Look for potential ATS structural issues (like tables or multi-columns)
  // Standard heuristic: If we find a high density of tabs or pipe symbols, or vertical bars
  const pipeCount = (rawText.match(/\|/g) || []).length;
  if (pipeCount > 8) {
    warnings.push({
      type: 'parsing_blocker',
      severity: 'medium',
      title: 'High Symbol Usage',
      message: 'Heavy usage of pipes (|) or visual dividers can sometimes throw off parsing software. Ensure plain text margins separate content.'
    });
  }

  return warnings;
}

/**
 * Main preprocessing pipeline function that runs all cleaning, segmentation,
 * extraction, and warning checks.
 * @param {string} rawText 
 * @returns {object} Complete preprocessed resume package
 */
function preprocessResume(rawText) {
  const cleaned = cleanText(rawText);
  const contact = extractContactInfo(cleaned);
  const segmented = segmentResume(cleaned);
  const skills = extractSkills(cleaned);
  const warnings = checkATSWarnings(segmented, cleaned);

  // Parse experience and project bullets for detailed metrics
  const parsedBullets = [];
  const parseBulletSections = (sectionText) => {
    if (!sectionText) return;
    // Split by newlines or typical bullet bullet symbols (•, -, *)
    const lines = sectionText.split('\n');
    for (let line of lines) {
      let tLine = line.trim();
      // Remove starting bullet characters
      tLine = tLine.replace(/^[•\-\*●■]\s*/, '').trim();
      
      if (tLine.length > 15) {
        parsedBullets.push(analyzeBulletPoint(tLine));
      }
    }
  };

  parseBulletSections(segmented.experience);
  parseBulletSections(segmented.projects);

  return {
    raw: rawText,
    cleaned: cleaned,
    contact: contact,
    sections: segmented,
    skills: skills,
    bullets: parsedBullets,
    warnings: warnings
  };
}

// Export for Node.js if available, or attach to window for browser client
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cleanText,
    extractContactInfo,
    segmentResume,
    analyzeBulletPoint,
    extractSkills,
    checkATSWarnings,
    preprocessResume,
    SKILLS_DICTIONARY,
    IMPACT_VERBS
  };
} else {
  window.ResumePreprocessor = {
    preprocessResume,
    cleanText,
    extractContactInfo,
    segmentResume,
    analyzeBulletPoint,
    extractSkills,
    checkATSWarnings,
    SKILLS_DICTIONARY,
    IMPACT_VERBS
  };
}
