// Initialize TinyMCE for the preview area
  tinymce.init({
    selector: '#emailPreviewBody',
    height: 350, 
    menubar: false,
    plugins: 'link image code lists autoresize',
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist | link image code',
    branding: false,
    readonly: false,
    setup: function(editor) {
        editor.on('init', function() {
            if (typeof updatePreview === 'function') {
                updatePreview(); 
            }
        });
    }
  });

  // Global variable to hold the most recently AI-generated text for the preview
  let currentGeneratedTextForPreview = ""; 

  // Function to update the TinyMCE preview
  function updatePreview() {
  const salutation = document.getElementById('emailSalutation')?.value || '';
  const opening = document.getElementById('emailOpening')?.value || '';
  const closing = document.getElementById('emailClosing')?.value || '';

  let contentToInsertInMiddle = "[AI-Generated Content Will Be Inserted Here]";

  // Compose salutation line 
  let salutationLine = "";
  if (salutation.trim() !== "") {
    salutationLine = `<p>${salutation.trim()} [Name],</p>`;
  } else {
    salutationLine = `<p>[Name],</p>`;
  }

  let previewContent = "";
  previewContent += salutationLine;
  previewContent += `<p>${opening.replace(/\n/g, '<br>')}</p>`;
  previewContent += contentToInsertInMiddle;
  previewContent += `<p style="margin-top:10px;">${closing.replace(/\n/g, '<br>')}</p>`;

  if (tinymce.get('emailPreviewBody')) {
      tinymce.get('emailPreviewBody').setContent(previewContent);
  } else {
      const previewDiv = document.getElementById('emailPreviewBody');
      if (previewDiv) previewDiv.innerHTML = previewContent;
  }
  }

  document.addEventListener('DOMContentLoaded', function() {
    const emailOpening = document.getElementById('emailOpening');
    const emailClosing = document.getElementById('emailClosing');
    const emailSalutation = document.getElementById('emailSalutation'); 
    const selectedPromptTextInfo = document.getElementById('selectedPromptTextInfo'); 
    
    const filterQuizType = document.getElementById('filterQuizType');
    const filterPersonalityType = document.getElementById('filterPersonalityType');
    const applyFiltersButton = document.getElementById('applyFiltersButton');
    const refreshPromptsButton = document.getElementById('refreshPromptsButton');
    const promptVersionsTableBody = document.querySelector('#promptVersionsTable tbody');

    let allPromptVersionsData = []; 
    let currentPromptsData = [];

    loadAllDataForComposer(); 

    if(emailOpening) emailOpening.addEventListener('keyup', updatePreview);
    if(emailClosing) emailClosing.addEventListener('keyup', updatePreview);
    if(emailSalutation) emailSalutation.addEventListener('keyup', updatePreview); 
    if(applyFiltersButton) applyFiltersButton.addEventListener('click', displayFilteredPromptVersions);
    if(refreshPromptsButton) refreshPromptsButton.addEventListener('click', loadAllDataForComposer);

    async function loadAllDataForComposer() {
        if(promptVersionsTableBody) promptVersionsTableBody.innerHTML = '<tr><td colspan="6">Loading prompts...</td></tr>';
        if(selectedPromptTextInfo) selectedPromptTextInfo.textContent = "None"; 
        currentGeneratedTextForPreview = ""; 
        updatePreview(); 

        try {
            const versionsResponse = await fetch('/prompts/recent?limit=200'); 
            if (!versionsResponse.ok) throw new Error(`Failed to load prompt versions (Status: ${versionsResponse.status})`);
            allPromptVersionsData = await versionsResponse.json();

            const currentPromptsResponse = await fetch('/prompts');
            if (!currentPromptsResponse.ok) throw new Error(`Failed to load current prompts (Status: ${currentPromptsResponse.status})`);
            currentPromptsData = await currentPromptsResponse.json();

            displayFilteredPromptVersions(); 
        } catch (error) {
            console.error("Error loading prompt data:", error);
            if(promptVersionsTableBody) promptVersionsTableBody.innerHTML = `<tr><td colspan="6">Error loading prompt data: ${error.message}</td></tr>`;
        }
    }
    
    const emailComposeForm = document.getElementById('emailComposeForm');
    if(emailComposeForm) {
        emailComposeForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(emailComposeForm);
            if (tinymce.get('emailPreviewBody')) { 
                const emailBodyHtml = tinymce.get('emailPreviewBody').getContent();
                formData.append('html_body', emailBodyHtml); 
            } else {
                alert("Email editor is not ready. Please wait a moment and try again.");
                return;
            }

            // Add visual feedback for sending
            const sendButton = emailComposeForm.querySelector('button[type="submit"]');
            const originalButtonText = sendButton.textContent;
            sendButton.textContent = 'Sending...';
            sendButton.disabled = true;

            try {
                const response = await fetch(emailComposeForm.action, { method: 'POST', body: formData });
                if (!response.ok) {
                    const errData = await response.json(); throw new Error(errData.error || `Failed to send. Status: ${response.status}`);
                }
                const result = await response.json(); 
                alert(result.message || 'Email sent!');

            } catch (error) {
                console.error('Error sending email:', error); 
                alert(`Error: ${error.message}`);
            } finally {
                sendButton.textContent = originalButtonText;
                sendButton.disabled = false;
            }
        });
    }
    let quizPersonalityMap = {};

    async function loadQuizzesAndSetupFilters() {
        const response = await fetch("/quizzes");
        const quizzes = await response.json();

        const quizSelect = document.getElementById("quiz_type");
        const personalitySelect = document.getElementById("personality_type");

        quizSelect.innerHTML = '<option value="">— choose quiz —</option>';
        quizPersonalityMap = {};

        quizzes.forEach(quiz => {
            if (!quizPersonalityMap[quiz.name]) {
                quizPersonalityMap[quiz.name] = [];
            }
            if (!quizPersonalityMap[quiz.name].includes(quiz.personality_type)) {
                quizPersonalityMap[quiz.name].push(quiz.personality_type);
            }
        });

        Object.keys(quizPersonalityMap).forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            quizSelect.appendChild(option);
        });

        quizSelect.addEventListener("change", updatePersonalityDropdown);
        updatePersonalityDropdown();
        fetchAndRenderFilteredUsers();
    }

    function updatePersonalityDropdown() {
        const selectedQuiz = document.getElementById("quiz_type").value;
        const personalitySelect = document.getElementById("personality_type");

        personalitySelect.innerHTML = '<option value="">— choose personality —</option>';
        const types = quizPersonalityMap[selectedQuiz] || [];

        types.forEach(pt => {
            const option = document.createElement("option");
            option.value = pt;
            option.textContent = pt;
            personalitySelect.appendChild(option);
        });

        fetchAndRenderFilteredUsers();
    }

    async function fetchAndRenderFilteredUsers() {
        const quiz = document.getElementById("quiz_type").value;
        const personality = document.getElementById("personality_type").value;
        const showRecipients = document.getElementById("edit_recipients_toggle").checked;
        const recipientContainer = document.getElementById("recipients_container");
        const recipientCountSpan = document.getElementById("recipient_count_display");

        if (!quiz || !personality) {
            recipientContainer.innerHTML = "<em>Pick quiz & personality to load recipients…</em>";
            if (recipientCountSpan) recipientCountSpan.textContent = "";
            return;
        }

        const response = await fetch(`/api/users/filter?quiz=${encodeURIComponent(quiz)}&personality=${encodeURIComponent(personality)}`);
        const filtered = await response.json();

        // Show recipient count
        if (recipientCountSpan) {
            recipientCountSpan.textContent = `(${filtered.length} recipient${filtered.length !== 1 ? 's' : ''})`;
        }

        recipientContainer.innerHTML = "";
        if (!showRecipients) {
            // When unchecked, add all as hidden inputs so all are sent
            filtered.forEach(user => {
                const hidden = document.createElement("input");
                hidden.type = "hidden";
                hidden.name = "recipients[]";
                hidden.value = user.email;
                recipientContainer.appendChild(hidden);
            });
            return;
        }

        if (filtered.length === 0) {
            recipientContainer.innerHTML = "<p>No matching users found.</p>";
            return;
        }

        filtered.forEach(user => {
            const wrapper = document.createElement("label");
            wrapper.style.display = "block";
            wrapper.innerHTML = `
                <input type="checkbox" name="recipients[]" value="${user.email}">
                ${user.email}
            `;
            recipientContainer.appendChild(wrapper);
        });
    }

    // Attach listeners for recipient filtering
    loadQuizzesAndSetupFilters();

    const showCheckbox = document.getElementById("edit_recipients_toggle");
    if (showCheckbox) {
        showCheckbox.addEventListener("change", fetchAndRenderFilteredUsers);
    }
    const personalitySelect = document.getElementById("personality_type");
    if (personalitySelect) {
        personalitySelect.addEventListener("change", fetchAndRenderFilteredUsers);
    }

    // Add after currentPromptsData is loaded in loadAllDataForComposer
    async function autoSelectPromptAndGenerate() {
        const quiz = document.getElementById("quiz_type")?.value;
        const personality = document.getElementById("personality_type")?.value;
        console.log("[autoSelectPromptAndGenerate] quiz:", quiz, "personality:", personality);
        if (!quiz || !personality) {
            console.log("[autoSelectPromptAndGenerate] Quiz or personality not selected, aborting.");
            return;
        }

        // Find matching prompt
        console.log("[autoSelectPromptAndGenerate] currentPromptsData:", currentPromptsData);
        const promptObj = currentPromptsData.find(
            p => p.prompt_type === "email" && p.quiz_name === quiz && p.personality_type === personality
        );
        console.log("[autoSelectPromptAndGenerate] Found promptObj:", promptObj);

        if (!promptObj) {
            currentGeneratedTextForPreview = "";
            updatePreview();
            if (selectedPromptTextInfo) selectedPromptTextInfo.textContent = "No matching prompt found.";
            console.log("[autoSelectPromptAndGenerate] No matching prompt found.");
            return;
        }

        if (selectedPromptTextInfo) selectedPromptTextInfo.textContent = `Generating for: ${promptObj.prompt_text.substring(0,30)}... (Current)`;
        currentGeneratedTextForPreview = "";
        updatePreview();

        try {
            console.log("[autoSelectPromptAndGenerate] Sending fetch to /api/generate-email-content");
            const genResponse = await fetch('/api/generate-email-content', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    prompt: promptObj.prompt_text, 
                    temperature: 0.7,
                    mbti_type: promptObj.personality_type 
                }),
            });
            const genData = await genResponse.json();
            console.log("[autoSelectPromptAndGenerate] genResponse.ok:", genResponse.ok, "genData:", genData);
            if (!genResponse.ok) throw new Error(genData.error || `HTTP error!`);
            currentGeneratedTextForPreview = genData.generated_text;
            updatePreview();
            if (selectedPromptTextInfo) selectedPromptTextInfo.textContent = `Previewing based on: ${promptObj.prompt_text.substring(0,30)}...`;
        } catch (error) {
            currentGeneratedTextForPreview = "";
            updatePreview();
            if (selectedPromptTextInfo) selectedPromptTextInfo.textContent = "Error generating. Select another.";
            console.error("[autoSelectPromptAndGenerate] Error:", error);
        }
    }

    // Call autoSelectPromptAndGenerate after loading prompts
    async function loadAllDataForComposer() {
        if(promptVersionsTableBody) promptVersionsTableBody.innerHTML = '<tr><td colspan="6">Loading prompts...</td></tr>';
        if(selectedPromptTextInfo) selectedPromptTextInfo.textContent = "None"; 
        currentGeneratedTextForPreview = ""; 
        updatePreview(); 

        try {
            const versionsResponse = await fetch('/prompts/recent?limit=200'); 
            if (!versionsResponse.ok) throw new Error(`Failed to load prompt versions (Status: ${versionsResponse.status})`);
            allPromptVersionsData = await versionsResponse.json();

            const currentPromptsResponse = await fetch('/prompts');
            if (!currentPromptsResponse.ok) throw new Error(`Failed to load current prompts (Status: ${currentPromptsResponse.status})`);
            currentPromptsData = await currentPromptsResponse.json();

            displayFilteredPromptVersions(); 
            await autoSelectPromptAndGenerate(); 
        } catch (error) {
            console.error("Error loading prompt data:", error);
            if(promptVersionsTableBody) promptVersionsTableBody.innerHTML = `<tr><td colspan="6">Error loading prompt data: ${error.message}</td></tr>`;
        }
    }

    // Listen for dropdown changes
    const quizSelect = document.getElementById("quiz_type");
    const personalitySelectDropdown = document.getElementById("personality_type");
    console.log("[main] quizSelect:", quizSelect, "personalitySelectDropdown:", personalitySelectDropdown);
    if (quizSelect) quizSelect.addEventListener("change", autoSelectPromptAndGenerate);
    if (personalitySelectDropdown) personalitySelectDropdown.addEventListener("change", autoSelectPromptAndGenerate);

});