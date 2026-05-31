/**
 * CV Shield UI Coordinator
 * Controls the interactive live editor workspace, score journey logging,
 * inline actionable warnings, template theme toggles, and document print utilities.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
  }

  // Active state trackers
  let currentResumeData = null;
  let theme = localStorage.getItem('theme') || 'dark';
  let activeWandBulletIdx = null;
  
  // Score Journey states
  let lastOverallScore = null;
  const scoreHistoryLogs = [];

  // DOM Elements: Headers & Resets
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const resetAppBtn = document.getElementById('reset-app-btn');
  const exportPdfBtn = document.getElementById('export-pdf-btn');

  // DOM Elements: Sidebar inputs
  const dropzone = document.getElementById('resume-dropzone');
  const fileInput = document.getElementById('resume-file-input');
  const fileInfoContainer = document.getElementById('file-info-container');
  const fileNameLabel = document.getElementById('file-name-label');
  const removeFileBtn = document.getElementById('remove-file-btn');
  const jdTextarea = document.getElementById('jd-textarea-input');
  const jdSkillsBadge = document.getElementById('jd-skills-badge');
  const jdMatchRatioLabel = document.getElementById('jd-match-ratio-val');
  const skillsTagsContainer = document.getElementById('skills-tags-container');
  const skillsTagsGrid = document.getElementById('skills-tags-grid');

  // DOM Elements: Central Workspace Editor
  const docLoadingOverlay = document.getElementById('doc-loading-overlay');
  const editorEmptyState = document.getElementById('editor-empty-state');
  const editableWorkspace = document.getElementById('editable-workspace-content');
  const loadDemoWorkspaceBtn = document.getElementById('load-demo-workspace-btn');
  
  const docCardWorkspace = document.getElementById('document-card-workspace');
  const docNameField = document.getElementById('doc-name-field');
  const docContactField = document.getElementById('doc-contact-field');
  const docSummaryField = document.getElementById('doc-summary-field');
  const docExperienceList = document.getElementById('doc-experience-list');
  const docEducationField = document.getElementById('doc-education-field');
  const docSkillsField = document.getElementById('doc-skills-field');
  const docProjectsList = document.getElementById('doc-projects-list');

  // List controllers buttons
  const addExperienceBtn = document.getElementById('add-experience-bullet-btn');
  const addProjectBtn = document.getElementById('add-project-bullet-btn');
  const themeSelectorGroup = document.getElementById('theme-selector-group');

  // DOM Elements: Right Side Core Metrics
  const labelOverall = document.getElementById('dashboard-overall-score');
  const labelBullets = document.getElementById('dashboard-bullets-score');
  const labelSkills = document.getElementById('dashboard-skills-score');
  const labelFormatting = document.getElementById('dashboard-formatting-score');
  const warningsList = document.getElementById('warnings-list-container');
  const bulletsChecklist = document.getElementById('bullets-checklist-container');
  const timelineLogContainer = document.getElementById('timeline-log-container');

  // DOM Elements: Modals
  const apiKeyModal = document.getElementById('api-key-modal');
  const modalKeyInput = document.getElementById('gemini-modal-key-input');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');

  // ==========================================
  // UI Theme Management (Dark / Light)
  // ==========================================
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon();

  themeToggleBtn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon();
  });

  function updateThemeIcon() {
    if (theme === 'light') {
      themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
      themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
  }

  // ==========================================
  // Document Style Theme Toggles
  // ==========================================
  themeSelectorGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-theme-select');
    if (!btn) return;

    // Toggle active button layout
    themeSelectorGroup.querySelectorAll('.btn-theme-select').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Apply design styles to resume card
    const themeClass = btn.getAttribute('data-theme-class');
    docCardWorkspace.className = `document-card ${themeClass}`;
    
    showNotification(`Switched resume theme style.`, 'info');
  });

  // ==========================================
  // Printable Exporter Trigger
  // ==========================================
  exportPdfBtn.addEventListener('click', () => {
    if (!currentResumeData) return;
    
    const originalTitle = document.title;
    const name = docNameField.textContent.trim() || 'Resume';
    document.title = `${name.replace(/\s+/g, '_')}_Resume_Optimized`;
    
    window.print();
    
    document.title = originalTitle;
  });

  // ==========================================
  // Uploader drag and drop events
  // ==========================================
  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleUploadedFile(files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) handleUploadedFile(files[0]);
  });

  removeFileBtn.addEventListener('click', () => resetWorkspaceStates());
  resetAppBtn.addEventListener('click', () => resetWorkspaceStates());

  function resetWorkspaceStates() {
    currentResumeData = null;
    fileInput.value = '';
    fileNameLabel.textContent = '';
    fileInfoContainer.style.display = 'none';
    dropzone.style.display = 'flex';
    resetAppBtn.style.display = 'none';
    exportPdfBtn.disabled = true;

    editorEmptyState.style.display = 'flex';
    editableWorkspace.style.display = 'none';

    // Clear dynamic grids
    warningsList.innerHTML = '';
    bulletsChecklist.innerHTML = '';
    skillsTagsContainer.style.display = 'none';
    skillsTagsGrid.innerHTML = '';
    jdSkillsBadge.style.display = 'none';
    timelineLogContainer.innerHTML = '';

    // Reset scores
    labelOverall.textContent = '0';
    labelBullets.textContent = '0%';
    labelSkills.textContent = '0%';
    labelFormatting.textContent = '0%';

    lastOverallScore = null;
    scoreHistoryLogs.length = 0;

    showNotification('Workspace reset completed.', 'info');
  }

  // ==========================================
  // Document parsing mechanics
  // ==========================================
  async function handleUploadedFile(file) {
    const validExtensions = ['pdf', 'docx', 'txt'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      showNotification('Invalid file layout. Upload PDF, DOCX, or TXT documents.', 'danger');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('File exceeds maximum size of 5MB.', 'danger');
      return;
    }

    fileNameLabel.textContent = file.name;
    fileInfoContainer.style.display = 'flex';
    dropzone.style.display = 'none';
    resetAppBtn.style.display = 'block';

    showNotification(`Importing ${file.name}...`, 'info');
    docLoadingOverlay.style.display = 'flex';

    try {
      let extractedText = '';
      if (fileExt === 'txt') {
        extractedText = await readTxtFile(file);
      } else if (fileExt === 'docx') {
        extractedText = await readDocxFile(file);
      } else if (fileExt === 'pdf') {
        extractedText = await readPdfFile(file);
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No characters parsed from document buffer.');
      }

      const preprocessed = window.ResumePreprocessor.preprocessResume(extractedText);
      populateWorkspaceDOM(preprocessed);
      showNotification('Resume successfully loaded in Live Editor.', 'success');
      
    } catch (err) {
      console.error(err);
      showNotification(`Import Failed: ${err.message}`, 'danger');
      resetWorkspaceStates();
    } finally {
      docLoadingOverlay.style.display = 'none';
    }
  }

  function readTxtFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read the raw text.'));
      reader.readAsText(file);
    });
  }

  function readDocxFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
          resolve(result.value);
        } catch (err) {
          reject(new Error('Mammoth parser error. Word file could not be parsed.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to load Word buffer.'));
      reader.readAsArrayBuffer(file);
    });
  }

  async function readPdfFile(file) {
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to load PDF buffer.'));
      reader.readAsArrayBuffer(file);
    });

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      let pageText = '';
      let lastY = -1;
      
      for (let item of textContent.items) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str + ' ';
        lastY = item.transform[5];
      }
      fullText += pageText + '\n';
    }

    return fullText;
  }

  // ==========================================
  // Load mock layouts & template triggers
  // ==========================================
  loadDemoWorkspaceBtn.addEventListener('click', () => loadDemoSoftwareTemplate());

  function loadDemoSoftwareTemplate() {
    const demo = {
      contact: {
        name: 'Johnathan Doe',
        rawContact: 'New York, NY | john.doe@email.com | (123) 456-7890 | github.com/johndoe | linkedin.com/in/johndoe'
      },
      sections: {
        summary: 'Highly motivated Senior Software Engineer with 6+ years of experience building scalable web applications. Expert in React, Node.js, and Cloud Infrastructure. Passionate about automating development pipelines and improving application performance.',
        experienceBullets: [
          'Spearheaded the migration of legacy monolith service to microservices architecture, which improved system reliability by 35%.',
          'Led a high-performing team of 5 engineers to deliver next-generation API platform using Node.js, Express, and PostgreSQL.',
          'Optimized React application rendering flows, reducing initial page load times by 1.2 seconds.',
          'Automated CI/CD deployment pipelines using GitHub Actions and AWS ECS, reducing deployment cycle times by 50%.',
          'Developed and launched a real-time analytics dashboard utilizing React, TypeScript, and Redis.',
          'Saved $12K in monthly cloud infrastructure costs by restructuring AWS Docker container orchestration.',
          'Collaborated with product designers to implement responsive, pixel-perfect user interface components.'
        ],
        education: 'Master of Science in Computer Science | New York University | GPA: 3.8\nBachelor of Science in Software Engineering | State University of New York',
        skills: 'Frontend: React, TypeScript, JavaScript, HTML5, CSS3, Tailwind CSS\nBackend & DB: Node.js, Express, Go, Python, SQL, PostgreSQL, MongoDB, Redis\nDevOps & Cloud: AWS, Docker, Kubernetes, CI/CD, GitHub Actions, Linux\nProcess & Methods: Agile, Scrum, Jira, Git',
        projectsBullets: [
          'Open Source Code Optimizer: Created a custom CLI tool using Node.js that scans repositories and auto-formats code patterns, gaining 400+ stars on GitHub.',
          'Real-time Chat App: Built a serverless chat application with React and Supabase, supporting 2,000+ active monthly users.'
        ]
      }
    };

    jdTextarea.value = "We are looking for a Senior Software Engineer with deep skills in React, TypeScript, Node.js, and cloud platforms like AWS. Experience with Docker, Kubernetes, and PostgreSQL is required. Knowledge of system design and CI/CD pipelines is a plus.";
    fileNameLabel.textContent = 'Demo_Workspace_Template.txt';
    fileInfoContainer.style.display = 'flex';
    dropzone.style.display = 'none';
    resetAppBtn.style.display = 'block';

    populateWorkspaceDOMFromTemplate(demo);
    showNotification('Professional Software template loaded.', 'success');
  }

  // ==========================================
  // Workspace DOM Injectors & Bindings
  // ==========================================
  function populateWorkspaceDOM(preprocessed) {
    editorEmptyState.style.display = 'none';
    editableWorkspace.style.display = 'flex';
    exportPdfBtn.disabled = false;

    // Contact info formatting
    docNameField.textContent = preprocessed.contact.name || 'FULL NAME';
    
    // Stitch contact details
    const details = [];
    if (preprocessed.contact.location) details.push(preprocessed.contact.location);
    if (preprocessed.contact.email) details.push(preprocessed.contact.email);
    if (preprocessed.contact.phone) details.push(preprocessed.contact.phone);
    if (preprocessed.contact.linkedin) details.push(preprocessed.contact.linkedin);
    if (preprocessed.contact.github) details.push(preprocessed.contact.github);
    docContactField.textContent = details.length > 0 ? details.join(' | ') : 'Email | Phone | Address | Github | LinkedIn';

    docSummaryField.textContent = preprocessed.sections.summary || 'Summary and career statement...';
    docEducationField.textContent = preprocessed.sections.education || 'Education and courses...';
    docSkillsField.textContent = preprocessed.sections.skills || 'Technical skills list...';

    populateBulletsList(docExperienceList, preprocessed.sections.experience);
    populateBulletsList(docProjectsList, preprocessed.sections.projects);

    // Initial compile
    recalculateWorkspaceScores();
  }

  function populateWorkspaceDOMFromTemplate(demo) {
    editorEmptyState.style.display = 'none';
    editableWorkspace.style.display = 'flex';
    exportPdfBtn.disabled = false;

    docNameField.textContent = demo.contact.name;
    docContactField.textContent = demo.contact.rawContact;
    docSummaryField.textContent = demo.sections.summary;
    docEducationField.textContent = demo.sections.education;
    docSkillsField.textContent = demo.sections.skills;

    // Bullet injectors
    docExperienceList.innerHTML = '';
    demo.sections.experienceBullets.forEach(text => {
      const li = document.createElement('li');
      li.className = 'doc-bullet-item';
      li.contentEditable = 'true';
      li.textContent = text;
      docExperienceList.appendChild(li);
    });

    docProjectsList.innerHTML = '';
    demo.sections.projectsBullets.forEach(text => {
      const li = document.createElement('li');
      li.className = 'doc-bullet-item';
      li.contentEditable = 'true';
      li.textContent = text;
      docProjectsList.appendChild(li);
    });

    recalculateWorkspaceScores();
  }

  function populateBulletsList(listElement, sectionText) {
    listElement.innerHTML = '';
    if (!sectionText) {
      const li = document.createElement('li');
      li.className = 'doc-bullet-item';
      li.contentEditable = 'true';
      li.textContent = 'Add bullet details...';
      listElement.appendChild(li);
      return;
    }

    const lines = sectionText.split('\n');
    lines.forEach(line => {
      let trimmed = line.trim();
      trimmed = trimmed.replace(/^[•\-\*●■]\s*/, '').trim();
      
      if (trimmed.length > 5) {
        const li = document.createElement('li');
        li.className = 'doc-bullet-item';
        li.contentEditable = 'true';
        li.textContent = trimmed;
        listElement.appendChild(li);
      }
    });
  }

  // ==========================================
  // Interactive Bullet List Modifiers
  // ==========================================
  addExperienceBtn.addEventListener('click', () => {
    addNewBulletRow(docExperienceList);
  });

  addProjectBtn.addEventListener('click', () => {
    addNewBulletRow(docProjectsList);
  });

  function addNewBulletRow(listElement) {
    const li = document.createElement('li');
    li.className = 'doc-bullet-item';
    li.contentEditable = 'true';
    li.textContent = 'Led a new initiative that accomplished results, quantified by 20% performance gains.';
    listElement.appendChild(li);
    
    // Auto-focus new row instantly
    li.focus();
    
    triggerDebouncedRecalculate();
    showNotification('New bullet point added.', 'info');
  }

  // ==========================================
  // Debounced Reactive Calculations
  // ==========================================
  let debounceTimer;
  function registerRealtimeListeners() {
    const fields = [docNameField, docContactField, docSummaryField, docEducationField, docSkillsField];
    fields.forEach(el => {
      el.addEventListener('input', () => triggerDebouncedRecalculate());
    });

    const bindBullets = (listEl) => {
      listEl.addEventListener('input', (e) => {
        if (e.target.classList.contains('doc-bullet-item')) {
          triggerDebouncedRecalculate();
        }
      });
      
      // Let empty bullet lines delete themselves when backspaced to be extra user friendly
      listEl.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.textContent.trim().length === 0) {
          const prev = e.target.previousElementSibling;
          e.target.remove();
          if (prev) prev.focus();
          triggerDebouncedRecalculate();
        }
      });
    };
    bindBullets(docExperienceList);
    bindBullets(docProjectsList);

    jdTextarea.addEventListener('input', () => triggerDebouncedRecalculate());
  }

  registerRealtimeListeners();

  function triggerDebouncedRecalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      recalculateWorkspaceScores();
    }, 600);
  }

  function recalculateWorkspaceScores() {
    if (!editableWorkspace.style.display || editableWorkspace.style.display === 'none') return;

    // 1. Compile plain text resume snapshot
    const name = docNameField.textContent.trim();
    const contact = docContactField.textContent.trim();
    const summary = docSummaryField.textContent.trim();
    const education = docEducationField.textContent.trim();
    const skills = docSkillsField.textContent.trim();

    const experienceBullets = Array.from(docExperienceList.querySelectorAll('.doc-bullet-item')).map(el => el.textContent.trim());
    const projectsBullets = Array.from(docProjectsList.querySelectorAll('.doc-bullet-item')).map(el => el.textContent.trim());

    let rawText = `${name}\n${contact}\n\n`;
    if (summary) rawText += `Summary\n${summary}\n\n`;
    
    if (experienceBullets.length > 0) {
      rawText += `Work Experience\n`;
      experienceBullets.forEach(bullet => { rawText += `• ${bullet}\n`; });
      rawText += `\n`;
    }

    if (education) rawText += `Education\n${education}\n\n`;
    if (skills) rawText += `Skills\n${skills}\n\n`;
    
    if (projectsBullets.length > 0) {
      rawText += `Projects\n`;
      projectsBullets.forEach(bullet => { rawText += `• ${bullet}\n`; });
      rawText += `\n`;
    }

    // 2. Preprocess text
    const preprocessed = window.ResumePreprocessor.preprocessResume(rawText);
    
    // 3. Compute heuristic scores
    const jdText = jdTextarea.value;
    const evaluation = window.ResumeAnalyzer.evaluateResume(preprocessed, jdText);

    currentResumeData = {
      preprocessed: preprocessed,
      evaluation: evaluation,
      aiResults: currentResumeData?.aiResults || null
    };

    // 4. Update Gauges
    labelOverall.textContent = evaluation.overall;
    labelBullets.textContent = evaluation.bullets + '%';
    labelSkills.textContent = evaluation.skills + '%';
    labelFormatting.textContent = evaluation.formatting + '%';

    // 5. Render Warnings List
    renderWarnings(preprocessed);

    // 6. Draw Bullet checklist
    renderBulletAudits(preprocessed);

    // 7. Render dynamic tags
    renderSkillsOverlaps(preprocessed, evaluation);

    // 8. Log Score Journey Timeline Progression!
    updateScoreJourneyTimeline(evaluation.overall);
  }

  // ==========================================
  // Visual Renderers: Warnings with Inline "Fix It" Action Buttons
  // ==========================================
  function renderWarnings(preprocessed) {
    warningsList.innerHTML = '';
    
    if (preprocessed.warnings.length === 0) {
      warningsList.innerHTML = `
        <div class="warning-mini-card severity-info" style="border-left-color: hsl(var(--success));">
          <div class="warning-icon" style="color: hsl(var(--success));">✓</div>
          <div>
            <div style="font-weight: 700; font-size: 0.8rem;">ATS Standards Passed</div>
            <div style="font-size: 0.7rem; color: hsl(var(--text-secondary));">Structural layouts conform to ATS scanning parsers.</div>
          </div>
        </div>
      `;
      return;
    }

    preprocessed.warnings.forEach((w, idx) => {
      const card = document.createElement('div');
      card.className = `warning-mini-card severity-${w.severity}`;
      
      let indicator = '⚠';
      let color = 'hsl(var(--warning))';
      if (w.severity === 'high') { indicator = '✗'; color = 'hsl(var(--danger))'; }
      
      // Determine if this warning type has a direct "Fix It" macro launcher
      let fixBtnHtml = '';
      const fixableTypes = ['missing_contact', 'missing_section'];
      if (fixableTypes.includes(w.type)) {
        fixBtnHtml = `<button class="btn-fix" data-warning-type="${w.type}" data-warning-title="${w.title}">Fix It</button>`;
      }

      card.innerHTML = `
        <div style="display: flex; gap: 0.5rem;">
          <div class="warning-icon" style="color: ${color}; font-weight: 800; font-size: 0.95rem;">${indicator}</div>
          <div>
            <div style="font-weight: 700; font-size: 0.8rem; color: hsl(var(--text-primary));">${w.title}</div>
            <div style="font-size: 0.7rem; color: hsl(var(--text-secondary));">${w.message}</div>
          </div>
        </div>
        ${fixBtnHtml}
      `;

      // Bind dynamic fix macro
      if (fixBtnHtml) {
        card.querySelector('.btn-fix').addEventListener('click', (e) => {
          applyWarningFix(e.target.getAttribute('data-warning-title'));
        });
      }

      warningsList.appendChild(card);
    });
  }

  function applyWarningFix(warningTitle) {
    showNotification(`Applying fix for: "${warningTitle}"...`, 'info');

    if (warningTitle.includes('Email Address')) {
      docContactField.focus();
      docContactField.textContent = docContactField.textContent.replace(/EMAIL_PLACEHOLDER/gi, '').trim();
      docContactField.textContent += " | candidate.name@domain.com";
      triggerDebouncedRecalculate();
    } else if (warningTitle.includes('Phone Number')) {
      docContactField.focus();
      docContactField.textContent += " | (555) 019-2834";
      triggerDebouncedRecalculate();
    } else if (warningTitle.includes('Name Not Identified')) {
      docNameField.focus();
      docNameField.textContent = "Your Name";
      triggerDebouncedRecalculate();
    } else if (warningTitle.includes('Summary Section')) {
      docSummaryField.focus();
      docSummaryField.textContent = "Results-driven Senior Professional with a proven track record of designing scalable applications, optimizing workflow performance, and leading teams to deliver high-quality solutions.";
      triggerDebouncedRecalculate();
    } else if (warningTitle.includes('Skills Section')) {
      docSkillsField.focus();
      docSkillsField.textContent = "Technical Skills: JavaScript, React, Node.js, SQL, AWS, Docker, Git, Agile";
      triggerDebouncedRecalculate();
    } else if (warningTitle.includes('Education Section')) {
      docEducationField.focus();
      docEducationField.textContent = "Bachelor of Science in Computer Science | State University";
      triggerDebouncedRecalculate();
    } else {
      showNotification('Please edit the fields directly to resolve this warning.', 'info');
    }
  }

  function renderSkillsOverlaps(preprocessed, evaluation) {
    if (evaluation.matchedJdSkills.length > 0) {
      skillsTagsContainer.style.display = 'flex';
      jdSkillsBadge.style.display = 'inline-flex';
      jdMatchRatioLabel.textContent = evaluation.skillsMatchPercent + '%';

      skillsTagsGrid.innerHTML = '';

      const flatList = preprocessed.skills.flatList;
      const resumeSkillsSet = new Set(flatList.map(s => s.toLowerCase()));

      evaluation.matchedJdSkills.forEach(skill => {
        const badge = document.createElement('span');
        const isMatch = resumeSkillsSet.has(skill.toLowerCase());
        
        badge.className = `skill-badge ${isMatch ? 'badge-match' : 'badge-gap'}`;
        badge.textContent = `${isMatch ? '✓' : '+'} ${skill}`;
        
        skillsTagsGrid.appendChild(badge);
      });

    } else {
      skillsTagsContainer.style.display = 'none';
      jdSkillsBadge.style.display = 'none';
      skillsTagsGrid.innerHTML = '';
    }
  }

  // ==========================================
  // Visual Renderers: Score Journey History Timeline Logger
  // ==========================================
  function updateScoreJourneyTimeline(currentScore) {
    // 1. Handle first entry initialization
    if (lastOverallScore === null) {
      lastOverallScore = currentScore;
      logJourneyEntry(currentScore, 0, "Base resume document imported into active workspace.");
      return;
    }

    // 2. Detect score difference milestones
    if (currentScore !== lastOverallScore) {
      const diff = currentScore - lastOverallScore;
      lastOverallScore = currentScore;
      
      let message = "Modified editor workspace text.";
      if (diff > 0) {
        if (diff >= 15) message = "Applied STAR bullet optimization to experience blocks.";
        else if (diff >= 8) message = "Resolved layout warnings and contact omissions.";
        else message = "Added target skills keywords to document.";
      } else {
        message = "Removed structural content blocks.";
      }

      logJourneyEntry(currentScore, diff, message);
    }
  }

  function logJourneyEntry(score, diff, message) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    scoreHistoryLogs.unshift({ score, diff, message, timestamp }); // Prepend latest log

    renderTimelineLogs();
  }

  function renderTimelineLogs() {
    timelineLogContainer.innerHTML = '';

    scoreHistoryLogs.forEach((log) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';

      let dotClass = 'dot-init';
      let badgeClass = 'diff-neutral';
      let diffText = 'Start';

      if (log.diff > 0) {
        dotClass = 'dot-up';
        badgeClass = 'diff-positive';
        diffText = `+${log.diff} pts`;
      } else if (log.diff < 0) {
        dotClass = 'dot-down';
        badgeClass = 'diff-negative';
        diffText = `${log.diff} pts`;
      }

      item.innerHTML = `
        <div class="timeline-dot ${dotClass}"></div>
        <div class="timeline-header">
          <span style="font-family: var(--font-heading); font-weight: 700; font-size: 0.8rem;">Score: ${log.score}</span>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span class="timeline-diff-badge ${badgeClass}">${diffText}</span>
            <span class="timeline-time">${log.timestamp}</span>
          </div>
        </div>
        <div class="timeline-body">${log.message}</div>
      `;

      timelineLogContainer.appendChild(item);
    });
  }

  // ==========================================
  // Visual Renderers: Bullet checklist auditor
  // ==========================================
  function renderBulletAudits(preprocessed) {
    bulletsChecklist.innerHTML = '';

    if (preprocessed.bullets.length === 0) {
      bulletsChecklist.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: hsl(var(--text-muted)); font-size: 0.75rem;">No experience bullets mapped. Type them inside the workspace.</div>';
      return;
    }

    preprocessed.bullets.forEach((b, idx) => {
      const card = document.createElement('div');
      card.className = 'audit-bullet-card';
      card.id = `audit-bullet-card-${idx}`;

      let scoreColor = 'hsl(var(--success))';
      if (b.score < 60) scoreColor = 'hsl(var(--danger))';
      else if (b.score < 85) scoreColor = 'hsl(var(--warning))';

      let verbChip = b.hasImpactVerb
        ? `<span class="audit-chip chip-success">✓ Strong Verb</span>`
        : `<span class="audit-chip chip-danger">✗ Weak Verb</span>`;

      let metricChip = b.hasMetric
        ? `<span class="audit-chip chip-success">✓ Quantified</span>`
        : `<span class="audit-chip chip-danger">✗ Lacks Metrics</span>`;

      let scoreChip = `<span class="audit-chip ${b.wordCount >= 6 && b.wordCount <= 25 ? 'chip-success' : 'chip-danger'}">Length: ${b.wordCount}</span>`;

      card.innerHTML = `
        <div class="audit-bullet-card-header">
          <span>Bullet #${idx + 1}</span>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="audit-bullet-score" style="color: ${scoreColor};">${b.score}/100</span>
            <span class="magic-wand-action" data-idx="${idx}" title="Optimize bullet with Gemini AI">✦ AI</span>
          </div>
        </div>
        <div class="audit-bullet-text">"${b.text.substring(0, 80)}${b.text.length > 80 ? '...' : ''}"</div>
        <div class="audit-bullet-chips">
          ${scoreChip}
          ${verbChip}
          ${metricChip}
        </div>
        <div class="magic-wand-panel-container" id="wand-panel-container-${idx}" style="display: none;"></div>
      `;

      card.querySelector('.magic-wand-action').addEventListener('click', (e) => {
        const bulletIdx = parseInt(e.target.getAttribute('data-idx'));
        triggerWandOptimization(bulletIdx, b.text);
      });

      bulletsChecklist.appendChild(card);
    });
  }

  // ==========================================
  // Secure API Modal Key setup
  // ==========================================
  modalCancelBtn.addEventListener('click', () => {
    apiKeyModal.style.display = 'none';
  });

  modalSaveBtn.addEventListener('click', () => {
    const key = modalKeyInput.value.trim();
    if (key) {
      sessionStorage.setItem('gemini_api_key', key);
      apiKeyModal.style.display = 'none';
      showNotification('Gemini API key saved.', 'success');
      
      if (activeWandBulletIdx !== null) {
        const bulletText = currentResumeData.preprocessed.bullets[activeWandBulletIdx].text;
        triggerWandOptimization(activeWandBulletIdx, bulletText);
      }
    } else {
      showNotification('Please enter a valid key.', 'danger');
    }
  });

  // ==========================================
  // Gemini AI Magic Wand Optimizers
  // ==========================================
  async function triggerWandOptimization(bulletIdx, bulletText) {
    const key = sessionStorage.getItem('gemini_api_key');
    if (!key) {
      activeWandBulletIdx = bulletIdx;
      apiKeyModal.style.display = 'flex';
      modalKeyInput.focus();
      return;
    }

    const panelContainer = document.getElementById(`wand-panel-container-${bulletIdx}`);
    panelContainer.innerHTML = `
      <div class="magic-wand-panel" style="align-items: center; justify-content: center; min-height: 50px;">
        <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
        <span style="font-size: 0.65rem; color: hsl(var(--text-muted));">Consulting Gemini Model...</span>
      </div>
    `;
    panelContainer.style.display = 'block';

    try {
      const targetJd = jdTextarea.value;
      const responseText = await queryWandAPI(key, bulletText, targetJd);
      
      let parsed = { revised: '', rationale: '' };
      try {
        parsed = JSON.parse(responseText);
      } catch (err) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        else throw new Error('Unparseable AI response layout.');
      }

      panelContainer.innerHTML = `
        <div class="magic-wand-panel">
          <div style="font-weight: 700; color: hsl(var(--accent-secondary)); margin-bottom: 0.15rem;">STAR Optimization:</div>
          <div class="magic-wand-revised" id="wand-revised-text-${bulletIdx}">"${parsed.revised}"</div>
          <div style="color: hsl(var(--text-muted)); line-height: 1.3; font-size: 0.65rem;"><strong>Rationale:</strong> ${parsed.rationale}</div>
          <button class="btn btn-primary" id="wand-apply-btn-${bulletIdx}" style="padding: 0.2rem 0.5rem; font-size: 0.65rem; margin-top: 0.35rem; align-self: flex-start;">
            Apply Instantly
          </button>
        </div>
      `;

      document.getElementById(`wand-apply-btn-${bulletIdx}`).addEventListener('click', () => {
        applyAIBulletRewrite(bulletIdx, parsed.revised);
      });

    } catch (err) {
      console.error(err);
      panelContainer.innerHTML = `
        <div class="magic-wand-panel" style="border-color: hsl(var(--danger) / 0.4);">
          <span style="color: hsl(var(--danger));">Optimization Failed:</span>
          <span style="font-size: 0.65rem; color: hsl(var(--text-secondary));">${err.message}</span>
        </div>
      `;
    }
  }

  async function queryWandAPI(apiKey, bulletText, targetJd = '') {
    const systemPrompt = `
You are an expert executive resume parser.
Rewrite the candidate's single experience bullet point to use the STAR method. Ensure it leads with a strong action verb, includes a quantified metric (e.g. percentages, counts, budgets), and aligns with the target Job Description (if provided).

Return your response in pure JSON format matching this schema:
{
  "revised": "The complete rewritten bullet point",
  "rationale": "1 sentence brief explanation of changes"
}
Do NOT output any markdown ticks or block codes. Return pure JSON.
`;

    const userPrompt = `
BULLET POINT:
"${bulletText}"

TARGET JOB DESCRIPTION (IF APPLICABLE):
"${targetJd}"
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: userPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errMsg = errorBody.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Gemini API Error: ${errMsg}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) throw new Error('Empty response returned.');
    return textContent;
  }

  function applyAIBulletRewrite(bulletIdx, revisedText) {
    const experienceBullets = Array.from(docExperienceList.querySelectorAll('.doc-bullet-item'));
    const projectsBullets = Array.from(docProjectsList.querySelectorAll('.doc-bullet-item'));
    
    const totalBullets = [...experienceBullets, ...projectsBullets];

    if (totalBullets[bulletIdx]) {
      totalBullets[bulletIdx].textContent = revisedText;
      showNotification(`Applied AI rewrite to bullet #${bulletIdx + 1}.`, 'success');
      recalculateWorkspaceScores();
    } else {
      showNotification('Failed to locate corresponding bullet target.', 'danger');
    }
  }

  // ==========================================
  // Custom Toast Notification System
  // ==========================================
  function showNotification(message, type = 'info') {
    const existing = document.querySelectorAll('.toast-notification');
    existing.forEach(e => e.remove());

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    toast.style.position = 'fixed';
    toast.style.bottom = '2rem';
    toast.style.right = '2rem';
    toast.style.padding = '0.65rem 1.1rem';
    toast.style.borderRadius = '6px';
    toast.style.fontSize = '0.8rem';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '1000';
    toast.style.boxShadow = 'var(--shadow-md)';
    toast.style.animation = 'fadeIn 0.2s ease, fadeOut 0.2s ease 4.8s forwards';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.5rem';
    toast.style.fontFamily = 'var(--font-heading)';

    let bg = 'hsl(220 20% 12%)';
    let text = '#fff';
    let border = '1px solid hsl(var(--border-color))';

    if (type === 'success') {
      bg = 'hsl(145 80% 8%)';
      text = 'hsl(145 80% 43%)';
      border = '1px solid hsl(145 80% 20%)';
    } else if (type === 'danger') {
      bg = 'hsl(355 85% 8%)';
      text = 'hsl(355 85% 53%)';
      border = '1px solid hsl(355 85% 20%)';
    } else if (type === 'warning') {
      bg = 'hsl(35 100% 8%)';
      text = 'hsl(35 100% 53%)';
      border = '1px solid hsl(35 100% 20%)';
    }

    toast.style.background = bg;
    toast.style.color = text;
    toast.style.border = border;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }
});
