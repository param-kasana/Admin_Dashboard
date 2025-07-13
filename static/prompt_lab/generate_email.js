// static/prompt_lab/generate_email.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Element References
    const temperatureSlider = document.getElementById('temperature_slider');
    const temperatureValueDisplay = document.getElementById('temperature_value_display');
    const generateButton = document.getElementById('generate_email_button');
    const promptTextarea = document.getElementById('prompt_text');
    
    const generationOutputArea = document.getElementById('generation_output_area');
    const singleOutputLabel = document.getElementById('single_output_label');
    const generatedBodySingleTextarea = document.getElementById('generated_body_single');
    const multipleOutputsContainer = document.getElementById('multiple_outputs_container');

    const personalityTypeSelect = document.getElementById('personality_type');
    const quizTypeSelect = document.getElementById('quiz_type');
    const llmCheckboxContainer = document.getElementById('llm_checkbox_container_generate');
    
    const generationStatus = document.getElementById('generation_status');

    const currentPromptTableBody = document.querySelector("#currentPromptTable tbody");
    const previousPromptTableBody = document.querySelector("#previousPromptTable tbody");

    // State Variables
    let availableLLMs = []; 
    let quizPersonalityMap = {};

    // --- Initialization ---
    async function initializePage() {
        await fetchAndPopulateLLMs();
        await loadQuizzesAndPersonalities();
    }

    // --- Fetching and Populating Data ---
    async function fetchAndPopulateLLMs() {
        try {
            const response = await fetch('/llms'); 
            if (!response.ok) throw new Error(`Failed to fetch LLMs (Status: ${response.status})`);
            availableLLMs = await response.json();

            if (llmCheckboxContainer) {
                llmCheckboxContainer.innerHTML = ''; 
                if (availableLLMs.length === 0) {
                    llmCheckboxContainer.innerHTML = '<p><em>No AI models available.</em></p>';
                    return;
                }
                availableLLMs.forEach(llm => {
                    const label = document.createElement('label');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = `${llm.api_provider}:${llm.model_name}`; 
                    checkbox.id = `llm_gen_${llm.id}`;
                    checkbox.dataset.llmId = llm.id; 
                    checkbox.dataset.llmName = llm.name; 

                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(` ${llm.name}`));
                    llmCheckboxContainer.appendChild(label);
                    llmCheckboxContainer.appendChild(document.createElement('br'));
                });
            }
        } catch (error) {
            console.error("Error fetching/populating LLMs:", error);
            if (llmCheckboxContainer) llmCheckboxContainer.innerHTML = `<p><em>Error loading AI models: ${error.message}</em></p>`;
        }
    }
    
    async function loadQuizzesAndPersonalities() {
        try {
            const response = await fetch("/quizzes");
            if (!response.ok) throw new Error('Failed to load quizzes data');
            const quizzesData = await response.json();
            
            if(!quizTypeSelect) { console.error("Quiz type select element not found."); return; }
            quizTypeSelect.innerHTML = '<option value="">-- Select Quiz Type --</option>';
            
            quizPersonalityMap = {};
            const uniqueQuizNames = new Set();

            quizzesData.forEach(quizEntry => {
                uniqueQuizNames.add(quizEntry.name);
                if (!quizPersonalityMap[quizEntry.name]) {
                    quizPersonalityMap[quizEntry.name] = [];
                }
                if (!quizPersonalityMap[quizEntry.name].includes(quizEntry.personality_type)) {
                    quizPersonalityMap[quizEntry.name].push(quizEntry.personality_type);
                }
            });

            uniqueQuizNames.forEach(name => {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = name;
                quizTypeSelect.appendChild(option);
            });
            
            updatePersonalityDropdown(); 
        } catch (error) {
            console.error("Error loading quizzes and personalities:", error);
        }
    }

    function updatePersonalityDropdown() {
        const selectedQuiz = quizTypeSelect?.value || "";
        if(!personalityTypeSelect) { console.error("Personality type select element not found."); return; }
        
        personalityTypeSelect.innerHTML = '<option value="">-- Select Personality Type --</option>';
        const personalities = quizPersonalityMap[selectedQuiz] || [];
        
        personalities.forEach(pt => {
            const option = document.createElement("option");
            option.value = pt;
            option.textContent = pt;
            personalityTypeSelect.appendChild(option);
        });
        loadEmailPrompts(); 
    }

    // --- Event Listeners ---
    if(temperatureSlider && temperatureValueDisplay) {
        temperatureSlider.addEventListener('input', function() {
            temperatureValueDisplay.textContent = (this.value / 10).toFixed(1);
        });
    }
    if(generateButton) generateButton.addEventListener('click', handleGenerateClick);
    if(quizTypeSelect) quizTypeSelect.addEventListener("change", updatePersonalityDropdown);
    if(personalityTypeSelect) personalityTypeSelect.addEventListener("change", loadEmailPrompts);

    // --- Event Handlers (handleGenerateClick, handleSavePromptClick) ---
    async function handleGenerateClick() {
        const prompt = promptTextarea?.value.trim() || "";
        const temperature = parseFloat(temperatureSlider?.value || 7) / 10;
        const mbtiTypeValue = personalityTypeSelect?.value || "";
        const quizTypeValue = quizTypeSelect?.value || "";

        if(!llmCheckboxContainer) { alert("LLM container not found."); return; }
        const selectedLLMCheckboxes = Array.from(llmCheckboxContainer.querySelectorAll('input[type="checkbox"]:checked'));
        const selectedModelIdentifiers = selectedLLMCheckboxes.map(cb => cb.value);

        if (!prompt) { alert('Please enter a prompt.'); return; }
        if (selectedModelIdentifiers.length === 0) { alert('Please select at least one AI Model.'); return; }
        if (!quizTypeValue) { alert('Please select a Quiz Type.'); quizTypeSelect?.focus(); return; }
        if (!mbtiTypeValue) { alert('Please select a Personality Type.'); personalityTypeSelect?.focus(); return; }

        if(generationStatus) generationStatus.textContent = 'Generating...';
        if(generatedBodySingleTextarea) { generatedBodySingleTextarea.value = ''; generatedBodySingleTextarea.style.display = 'none'; }
        if(multipleOutputsContainer) { multipleOutputsContainer.innerHTML = ''; multipleOutputsContainer.style.display = 'none'; }
        if(singleOutputLabel) singleOutputLabel.style.display = 'none';
        if(generateButton) generateButton.disabled = true;

        let allResultsSuccessful = true;

        for (const modelIdentifier of selectedModelIdentifiers) {
            const modelCheckbox = selectedLLMCheckboxes.find(cb => cb.value === modelIdentifier);
            const modelFriendlyName = modelCheckbox?.dataset.llmName || modelIdentifier;
            const llmId = modelCheckbox?.dataset.llmId;

            if(generationStatus) generationStatus.textContent = `Generating with ${modelFriendlyName}...`;

            try {
                const response = await fetch('/api/generate-email-content', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        prompt, temperature,
                        mbti_type: mbtiTypeValue,
                        quiz_type: quizTypeValue,
                        model_name: modelIdentifier
                    }),
                });
                const data = await response.json();
                if (!response.ok) {
                    allResultsSuccessful = false;
                    throw new Error(data.error || `HTTP error with ${modelFriendlyName}: ${response.status}`);
                }

                if (selectedModelIdentifiers.length === 1) {
                    if(generatedBodySingleTextarea) {
                        generatedBodySingleTextarea.value = data.generated_text;
                        generatedBodySingleTextarea.style.display = 'block';
                    }
                    if(singleOutputLabel) singleOutputLabel.style.display = 'block';

                    // Add Save button for single output
                    let saveBtn = document.getElementById('save_single_output_btn');
                    if (!saveBtn) {
                        saveBtn = document.createElement('button');
                        saveBtn.id = 'save_single_output_btn';
                        saveBtn.className = 'button-primary';
                        saveBtn.textContent = 'Save This';
                        generatedBodySingleTextarea.parentNode.insertBefore(saveBtn, generatedBodySingleTextarea.nextSibling);
                    }
                    saveBtn.style.display = 'inline-block';
                    saveBtn.onclick = async function() {
                        const originalText = saveBtn.textContent;
                        saveBtn.textContent = "Saving...";
                        saveBtn.disabled = true;
                        await savePromptWithLLM(promptTextarea.value.trim(), quizTypeValue, mbtiTypeValue, llmId, saveBtn);
                        saveBtn.textContent = originalText;
                        saveBtn.disabled = false;
                    };
                } else if (multipleOutputsContainer) {
                    const outputBlock = document.createElement('div');
                    outputBlock.className = 'model-output-block';
                    outputBlock.innerHTML = `<h4>${modelFriendlyName}</h4>
                        <textarea readonly rows="6">${data.generated_text}</textarea>
                        <button class="button-primary save-output-btn" style="margin-top:5px;">Save This</button>`;
                    multipleOutputsContainer.appendChild(outputBlock);
                    multipleOutputsContainer.style.display = 'block';

                    // Attach save handler
                    const saveBtn = outputBlock.querySelector('.save-output-btn');
                    saveBtn.onclick = async function() {
                        const originalText = saveBtn.textContent;
                        saveBtn.textContent = "Saving...";
                        saveBtn.disabled = true;
                        await savePromptWithLLM(promptTextarea.value.trim(), quizTypeValue, mbtiTypeValue, llmId, saveBtn);
                        saveBtn.textContent = originalText;
                        saveBtn.disabled = false;
                    };
                }
            } catch (error) {
                allResultsSuccessful = false;
                console.error(`Error generating with ${modelIdentifier}:`, error);
                const errorDisplayTarget = selectedModelIdentifiers.length === 1 ? generatedBodySingleTextarea : multipleOutputsContainer;
                const errorFriendlyName = selectedModelIdentifiers.length === 1 ? "" : `<h4>${modelFriendlyName}</h4>`;
                if (errorDisplayTarget) {
                    if (selectedModelIdentifiers.length === 1 && singleOutputLabel) singleOutputLabel.style.display = 'block';
                    const errorContent = `<p style="color:red;">Error: ${error.message}</p>`;
                    if (selectedModelIdentifiers.length === 1 && generatedBodySingleTextarea) generatedBodySingleTextarea.value = `Error: ${error.message}`;
                    else if (multipleOutputsContainer) {
                        const errorBlock = document.createElement('div');
                        errorBlock.className = 'model-output-block';
                        errorBlock.innerHTML = errorFriendlyName + errorContent;
                        multipleOutputsContainer.appendChild(errorBlock);
                        multipleOutputsContainer.style.display = 'block';
                    }
                }
            }
        }

        if(generationStatus) generationStatus.textContent = allResultsSuccessful ? 'Generation(s) complete!' : 'Some generations may have failed.';
        if(generateButton) generateButton.disabled = false;
        clearStatusAfterDelay(generationStatus, 5000);
    }

    
    function clearStatusAfterDelay(element, delay = 3000) {
         setTimeout(() => { if (element && element.textContent) element.textContent = ''; }, delay);
    }

    async function loadEmailPrompts() {
        const quiz = quizTypeSelect?.value || "";
        const personality = personalityTypeSelect?.value || ""; // Use personalityTypeSelect
        const promptTypeFilter = "email"; 

        if (!currentPromptTableBody || !previousPromptTableBody){ 
            console.error("Prompt table body elements not found in loadEmailPrompts.");
            return; 
        }
        if (!quiz || !personality) { // Only load if both quiz and personality are selected
            currentPromptTableBody.innerHTML = "<tr><td colspan='5'>Select Quiz and Personality to see prompts.</td></tr>";
            previousPromptTableBody.innerHTML = "<tr><td colspan='7'>Select Quiz and Personality to see prompts.</td></tr>";
            return;
        }
        
        try {
            const response = await fetch("/prompts/all"); 
            if(!response.ok) throw new Error(`Failed to fetch /prompts/all: ${response.status}`);
            const data = await response.json();

            currentPromptTableBody.innerHTML = ""; 
            const filteredCurrent = data.current.filter(entry =>
                entry.quiz_name === quiz &&
                entry.personality_type === personality && // Match against DB field name
                entry.prompt_type === promptTypeFilter
            );
            if (filteredCurrent.length === 0) {
                currentPromptTableBody.innerHTML = "<tr><td colspan='5'>No current 'email' prompt for this selection.</td></tr>";
            } else {
                filteredCurrent.forEach(entry => {
                    const row = currentPromptTableBody.insertRow();
                    row.innerHTML = `
                    <td>${entry.quiz_name || ''}</td>
                    <td>${entry.personality_type || ''}</td>
                    <td>${entry.prompt_type || ''}</td>
                    <td>${entry.prompt_text ? entry.prompt_text.substring(0,100) + (entry.prompt_text.length > 100 ? '...' : '') : ''}</td>
                    <td>${entry.llm_name || (entry.llm_id ? "LLM " + entry.llm_id : 'N/A')}</td>
                    `;
                });
            }

            previousPromptTableBody.innerHTML = ""; 
            const filteredPrevious = data.previous.filter(entry =>
                entry.quiz_name === quiz &&
                entry.personality_type === personality && // Match against DB field name
                entry.prompt_type === promptTypeFilter
            );
            if (filteredPrevious.length === 0) {
                previousPromptTableBody.innerHTML = "<tr><td colspan='7'>No previous 'email' prompt versions for this selection.</td></tr>";
            } else {
                filteredPrevious.forEach(entry => {
                    const row = previousPromptTableBody.insertRow();
                    row.innerHTML = `
                    <td>${entry.quiz_name || ''}</td>
                    <td>${entry.personality_type || ''}</td>
                    <td>${entry.prompt_type || ''}</td>
                    <td>${entry.prompt_text ? entry.prompt_text.substring(0,100) + (entry.prompt_text.length > 100 ? '...' : '') : ''}</td>
                    <td>${entry.llm_name || (entry.llm_id ? "LLM " + entry.llm_id : 'N/A')}</td>
                    <td>${entry.version_number || "-"}</td>
                    <td>
                        <button class="delete-prompt-btn" 
                                data-quiz="${entry.quiz_name}" 
                                data-personality="${entry.personality_type}" 
                                data-version="${entry.version_number}" 
                                data-language="${entry.language || 'English'}">Delete</button>
                    </td>
                    `;
                });
            }
            
            document.querySelectorAll('#previousPromptTable .delete-prompt-btn').forEach(btn => {
                const newBtn = btn.cloneNode(true); 
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', async function() {
                    const Dquiz = this.dataset.quiz; 
                    const Dpersonality = this.dataset.personality;
                    const Dversion = this.dataset.version;
                    const Dlanguage = this.dataset.language;
                    if (!confirm(`Delete v${Dversion} of ${Dquiz} - ${Dpersonality} (${Dlanguage})?`)) return;
                    try {
                        const resp = await fetch("/prompt-version", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                quiz_name: Dquiz,
                                personality_type: Dpersonality,
                                version_number: Number(Dversion),
                                language: Dlanguage 
                            })
                        });
                        const result = await resp.json();
                        if (resp.ok) {
                            alert("✅ Prompt version deleted");
                            loadEmailPrompts(); 
                        } else {
                            alert("❌ Failed to delete: " + (result.error || "Unknown error"));
                        }
                    } catch (err) {
                        alert("❌ Error deleting prompt: " + err.message);
                    }
                });
            });
        } catch (error) {
            console.error("Error loading email prompts:", error);
            if(currentPromptTableBody) currentPromptTableBody.innerHTML = `<tr><td colspan='5'>Error loading current prompts: ${error.message}</td></tr>`;
            if(previousPromptTableBody) previousPromptTableBody.innerHTML = `<tr><td colspan='7'>Error loading previous prompts: ${error.message}</td></tr>`;
        }
    }

    // Initial Page Setup
    initializePage();

    // Save helper
    async function savePromptWithLLM(promptText, quizTypeValue, mbtiTypeValue, llmId, saveBtn) {
        if (!promptText) { alert('Prompt text is required to save.'); return; }
        if (!mbtiTypeValue) { alert('Please select a Personality Type to save.'); return; }
        if (!quizTypeValue) { alert('Please select a Quiz Type to save.'); return; }
        if (!llmId) { alert('LLM ID missing.'); return; }

        // Default to English
        const language = "English";

        const payload = {
            prompt_text: promptText,
            prompt_type: "email",
            quiz_name: quizTypeValue,
            personality_type: mbtiTypeValue,
            llm_id: parseInt(llmId),
            language: language
        };

        try {
            const response = await fetch('/save-prompt', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `HTTP error! status: ${response.status}`);

            saveBtn.textContent = "Saved!";
            setTimeout(() => { saveBtn.textContent = "Save This"; }, 1200);
            await loadEmailPrompts();
        } catch (error) {
            console.error('Error saving prompt:', error);
            saveBtn.textContent = "Save Failed";
            setTimeout(() => { saveBtn.textContent = "Save This"; }, 2000);
        }
    }

});