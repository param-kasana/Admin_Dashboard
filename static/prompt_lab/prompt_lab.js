let quizPersonalityMap = {};  // Maps quiz name → [personality types]
let modelNameMap = {}; 

async function loadLLMs() {
  const response = await fetch("/llms");
  const llms = await response.json();
  const container = document.getElementById("llmCheckboxes");
  modelNameMap = {};

  container.innerHTML = ""; 

  llms.forEach(llm => {
    const fullModelId = `${llm.api_provider}:${llm.model_name}`;
    modelNameMap[fullModelId] = llm.name;
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" value="${llm.api_provider}:${llm.model_name}" data-llm-id="${llm.id}"> ${llm.name}
    `;
    container.appendChild(label);
  });
}

async function loadQuizzes() {
  const response = await fetch("/quizzes");
  const quizzes = await response.json();
  const quizSelect = document.getElementById("quizSelect");

  quizSelect.innerHTML = "";
  quizPersonalityMap = {};

  quizzes.forEach(quiz => {
    // Store personality types for each quiz name
    if (!quizPersonalityMap[quiz.name]) {
      quizPersonalityMap[quiz.name] = [];
    }
    if (!quizPersonalityMap[quiz.name].includes(quiz.personality_type)) {
      quizPersonalityMap[quiz.name].push(quiz.personality_type);
    }
  });

  // Populate quiz dropdown (only once per quiz name)
  Object.keys(quizPersonalityMap).forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    quizSelect.appendChild(option);
  });

  updatePersonalityDropdown();  // Load first quiz's personalities
}

function updatePersonalityDropdown() {
  const selectedQuiz = document.getElementById("quizSelect").value;
  const personalitySelect = document.getElementById("personalitySelect");

  personalitySelect.innerHTML = "";
  const personalities = quizPersonalityMap[selectedQuiz] || [];

  personalities.forEach(pt => {
    const option = document.createElement("option");
    option.value = pt;
    option.textContent = pt;
    personalitySelect.appendChild(option);
  });
}

async function runPrompt() {
  const prompt = document.getElementById("promptInput").value;
  const modelCheckboxes = document.querySelectorAll("#llmCheckboxes input[type=checkbox]:checked");
  const models = Array.from(modelCheckboxes).map(cb => cb.value);

  if (!prompt.trim() || models.length === 0) {
    alert("Please enter a prompt and select at least one LLM.");
    return;
  }
  const expectedFormat = document.getElementById("formatSelect").value;
  const response = await fetch("/run-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, models, format: expectedFormat })
  });

  const data = await response.json();
  const outputSection = document.getElementById("outputSection");
  const outputContainer = document.getElementById("generatedOutput");
  outputContainer.innerHTML = "";

  if (data.success) {
    for (const [model, result] of Object.entries(data.results)) {
      const llmCheckbox = Array.from(modelCheckboxes).find(cb => cb.value === model);
      const llmId = llmCheckbox ? llmCheckbox.dataset.llmId : null;
      const readableModelName = modelNameMap[model] || model;

      const block = document.createElement("div");
      block.className = "model-output";

      if (result.error) {
        block.innerHTML = `<h3>${readableModelName}</h3><p class="error">Error: ${result.error}</p>`;
      } else {
        block.innerHTML = `
          <h3>${readableModelName}</h3>
          <pre>${result.response}</pre>
          <button onclick='savePrompt("${llmId}", "${readableModelName}", ${JSON.stringify(prompt)})'>Save This Prompt</button>
        `;
      }
      outputContainer.appendChild(block);
    }
    outputSection.style.display = "block";
  } else {
    alert("Error: " + (data.error || "Unknown error"));
  }
}

async function savePrompt(llmId, model, prompt) {
  const quiz = document.getElementById("quizSelect").value;
  const personality = document.getElementById("personalitySelect").value;
  const promptType = document.getElementById("formatSelect").value;
  const language = document.getElementById("languageSelect").value;

  const response = await fetch("/save-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt_text: prompt,
      prompt_type: promptType,
      quiz_name: quiz,
      personality_type: personality,
      llm_id: parseInt(llmId),
      language : language
    })
  });

  const result = await response.json();
  if (response.ok) {
    alert(`Prompt saved for ${model}`);
    loadRecentPrompts(); // Refresh table
  } else {
    alert("Failed to save prompt: " + (result.error || "Unknown error"));
  }
}

async function deletePromptVersion(quizName, personalityType, versionNumber, language) {
  if (!confirm(`Delete version ${versionNumber} for ${quizName} - ${personalityType}?`)) return;

  const response = await fetch("/prompt-version", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      quiz_name: quizName,
      personality_type: personalityType,
      version_number: versionNumber,
      language: language
    })
  });

  const result = await response.json();
  if (response.ok) {
    alert("✅ Prompt version deleted");
    loadRecentPrompts();
  } else {
    alert("❌ Failed to delete: " + (result.error || "Unknown error"));
  }
}


async function loadRecentPrompts() {
  const response = await fetch("/prompts/all");
  const data = await response.json();

  const quiz = document.getElementById("quizSelect").value;
  const personality = document.getElementById("personalitySelect").value;
  const promptType = document.getElementById("formatSelect").value;
  const language = document.getElementById("languageSelect").value;

  // Filter current prompts
  const filteredCurrent = data.current.filter(entry =>
    entry.quiz_name === quiz &&
    entry.personality_type === personality &&
    entry.prompt_type === promptType &&
    entry.language === language
  );

  const currentTableBody = document.querySelector("#currentPromptTable tbody");
  currentTableBody.innerHTML = "";
  filteredCurrent.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.quiz_name}</td>
      <td>${entry.personality_type}</td>
      <td>${entry.prompt_type}</td>
      <td>${entry.language || ""}</td>
      <td>${entry.prompt_text}</td>
      <td>${entry.llm_name || "LLM " + entry.llm_id}</td>
    `;
    currentTableBody.appendChild(row);
  });

  // Filter previous prompts
  const filteredPrevious = data.previous.filter(entry =>
    entry.quiz_name === quiz &&
    entry.personality_type === personality &&
    entry.prompt_type === promptType &&
    entry.language === language
  );

  const previousTableBody = document.querySelector("#previousPromptTable tbody");
  previousTableBody.innerHTML = "";
  filteredPrevious.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.quiz_name}</td>
      <td>${entry.personality_type}</td>
      <td>${entry.prompt_type}</td>
      <td>${entry.language || ""}</td>
      <td>${entry.prompt_text}</td>
      <td>${entry.llm_name || "LLM " + entry.llm_id}</td>
      <td>${entry.version_number || "-"}</td>
      <td>
        <button onclick='deletePromptVersion("${entry.quiz_name}", "${entry.personality_type}", ${entry.version_number}, "${entry.language}")'>Delete</button>
      </td>
    `;
    previousTableBody.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadLLMs();
  loadQuizzes();
  loadRecentPrompts();
  document.getElementById("quizSelect").addEventListener("change", () => {
    updatePersonalityDropdown();
    loadRecentPrompts();  // re-filter after quiz change
  });
  document.getElementById("personalitySelect").addEventListener("change", loadRecentPrompts);
  document.getElementById("formatSelect").addEventListener("change", loadRecentPrompts);
  document.getElementById("languageSelect").addEventListener("change", loadRecentPrompts);

  // --- AI Toggle Logic ---
  const aiToggle = document.getElementById("aiToggle");
  const aiToggleLabel = document.getElementById("aiToggleLabel");

  async function fetchAISetting() {
    try {
      const res = await fetch("/api/ai-setting");
      const data = await res.json();
      const isEnabled = data.is_enabled;

      aiToggle.checked = isEnabled;
      aiToggleLabel.textContent = isEnabled ? "AI Enabled" : "AI Disabled";
    } catch (err) {
      console.error("Failed to fetch AI setting:", err);
      aiToggle.disabled = true;
      aiToggleLabel.textContent = "Unavailable";
    }
  }

  aiToggle?.addEventListener("change", async (e) => {
    const enabled = e.target.checked;
    aiToggleLabel.textContent = enabled ? "AI Enabled" : "AI Disabled";

    try {
      const res = await fetch("/api/ai-setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: enabled }),
      });
      if (!res.ok) throw new Error("Failed to update AI setting");
      const data = await res.json();
      aiToggleLabel.textContent = data.is_enabled ? "AI Enabled" : "AI Disabled";
    } catch (err) {
      alert("❌ Failed to update AI setting.");
      e.target.checked = !enabled;
      aiToggleLabel.textContent = !enabled ? "AI Enabled" : "AI Disabled";
    }
  });

  fetchAISetting();

});

