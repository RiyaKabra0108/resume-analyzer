/**
 * Preprocessor Test Harness
 * Demonstrates the resume preprocessing engine before building the frontend.
 * Run using Node.js.
 */

const { preprocessResume } = require('../js/preprocessor.js');

// 1. Mock Resume: High Quality Software Engineer
const goodResume = `
Johnathan Doe
New York, NY | john.doe@email.com | (123) 456-7890 | github.com/johndoe | linkedin.com/in/johndoe

Summary
Highly motivated Senior Software Engineer with 6+ years of experience building scalable web applications. Expert in React, Node.js, and Cloud Infrastructure. Passionate about automating development pipelines and improving application performance.

Work Experience
Lead Software Engineer | Tech Solutions Inc. | 2022 - Present
• Spearheaded the migration of legacy monolith service to microservices architecture, which improved system reliability by 35%.
• Led a high-performing team of 5 engineers to deliver next-generation API platform using Node.js, Express, and PostgreSQL.
• Optimized React application rendering flows, reducing initial page load times by 1.2 seconds.
• Automated CI/CD deployment pipelines using GitHub Actions and AWS ECS, reducing deployment cycle times by 50%.

Software Engineer | Innovate Corp | 2020 - 2022
• Developed and launched a real-time analytics dashboard utilizing React, TypeScript, and Redis.
• Saved $12K in monthly cloud infrastructure costs by restructuring AWS Docker container orchestration.
• Collaborated with product designers to implement responsive, pixel-perfect user interface components.

Education
Master of Science in Computer Science | New York University | GPA: 3.8
Bachelor of Science in Software Engineering | State University of New York

Skills
Frontend: React, TypeScript, JavaScript, HTML5, CSS3, Tailwind CSS
Backend & DB: Node.js, Express, Go, Python, SQL, PostgreSQL, MongoDB, Redis
DevOps & Cloud: AWS, Docker, Kubernetes, CI/CD, GitHub Actions, Linux
Process & Methods: Agile, Scrum, Jira, Git

Projects
• Open Source Code Optimizer: Created a custom CLI tool using Node.js that scans repositories and auto-formats code patterns, gaining 400+ stars on GitHub.
• Real-time Chat App: Built a serverless chat application with React and Supabase, supporting 2,000+ active monthly users.
`;

// 2. Mock Resume: Poorly Structured / Low Quality Resume
const poorResume = `
RESUME OF PETER SMITH
peter.smith@gmail.com
I want a job in computers. I have done many things.

My Background
I worked at some place from 2021 to 2023.
I did code inside React. I helped people. I fixed some bugs. It was good.
I also did some server things.

I went to a college.
I got a degree in business.

Things I know:
React, Excel, Typing fast, communication, speaking English.
`;

console.log("====================================================");
console.log("RESUME PREPROCESSOR SHOWCASE & VALIDATION");
console.log("====================================================\n");

function runTest(name, resumeText) {
  console.log(`--- Testing Preprocessor on: [${name}] ---`);
  const start = Date.now();
  const data = preprocessResume(resumeText);
  const duration = Date.now() - start;
  
  console.log(`Preprocessing completed in ${duration}ms.\n`);
  
  console.log("1. Contact Information Extracted:");
  console.log(JSON.stringify(data.contact, null, 2));
  console.log("");
  
  console.log("2. Section Segmentation Summary:");
  for (let key in data.sections) {
    const wordCount = data.sections[key] ? data.sections[key].split(/\s+/).length : 0;
    console.log(`   - Section [${key.toUpperCase().padEnd(14)}]: Found (${wordCount} words)`);
  }
  console.log("");

  console.log("3. Skills Extracted:");
  console.log(`   - Count: ${data.skills.count} skills`);
  console.log(`   - Flat List: ${data.skills.flatList.join(', ')}`);
  console.log(`   - Calculated Skill Density: ${data.skills.density}%`);
  console.log("");

  console.log("4. Bullet Points Metric Analysis (Sample of 3):");
  const bulletsSample = data.bullets.slice(0, 3);
  bulletsSample.forEach((b, idx) => {
    console.log(`   Bullet #${idx + 1}: "${b.text}"`);
    console.log(`     - Words: ${b.wordCount} | Impact Verb: ${b.hasImpactVerb ? 'YES ('+b.matchedVerb+')' : 'NO'} | Metric: ${b.hasMetric ? 'YES ('+b.matchedMetric+')' : 'NO'}`);
    console.log(`     - Bullet score: ${b.score}/100`);
    if (b.suggestions.length > 0) {
      console.log(`     - Suggestions: ${b.suggestions.join(' | ')}`);
    }
  });
  console.log("");

  console.log("5. ATS Red Flags & Warnings:");
  if (data.warnings.length === 0) {
    console.log("   - Clean! No red flags found.");
  } else {
    data.warnings.forEach(w => {
      console.log(`   - [${w.severity.toUpperCase()}] ${w.title}: ${w.message}`);
    });
  }
  console.log("\n====================================================\n");
}

runTest("Johnathan Doe (Senior Software Engineer)", goodResume);
runTest("Peter Smith (Poorly Structured)", poorResume);
