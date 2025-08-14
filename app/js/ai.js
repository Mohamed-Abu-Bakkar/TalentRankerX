const apiKey = "AIzaSyAkMYWqT8vL45Escf0VSRz782xZvpEilLI";
window.onload = function () {
  console.log("Window loaded. Checking ZOHO...");

  if (typeof ZOHO === "undefined") {
    console.error("❌ ZOHO SDK not loaded.");
    alert("This widget only works inside Zoho CRM.");
    return;
  }

  console.log("✅ ZOHO SDK is available.");

  // Initialize the embedded app
  ZOHO.embeddedApp.init().then(function() {
    console.log("✅ ZOHO embedded app initialized.");

    // Now register PageLoad event
    ZOHO.embeddedApp.on("PageLoad", function(data) {
      console.log("🚀 PageLoad event fired. Widget ready.");
      console.log("Page data:", ZOHO);

      // Now safely call getOrgVariable
      ZOHO.CRM.VARIABLE.getOrgVariable("talentbridge__Gemini_API")
        .then(function(response) {
          console.log("🎯 Variable fetched: ", response);
        })
        .catch(function(err) {
          console.error("❌ Failed to fetch variable:", err);
        });
    });
  });
};

const chatContainer = document.getElementById("chatContainer");
const promptInput = document.getElementById("promptInput");
const micBtn = document.getElementById("micBtn");

const preloadDocs = `
You are a helpful assistant named Zoho CRM Help Assistant. You are trained to answer questions related to:
- Zoho CRM (https://www.zoho.com/crm/help/)
- Deluge Scripting (https://www.zoho.com/deluge/help/)
Respond clearly, concisely, and with relevant examples when needed and you are developed by TeamDefault.
`;

window.addEventListener("DOMContentLoaded", () => {
  greetBot();
  promptInput.focus();
});

promptInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

function greetBot() {
  const msg =
    "Hello! I’m your Zoho CRM Help Assistant.\nAsk me anything about Zoho CRM or Deluge scripting.";
  const html = marked.parse(msg);
  addMessage("bot", html, true);
}

function addMessage(sender, text, isHTML = false) {
  const message = document.createElement("div");
  message.classList.add(
    "p-3",
    "rounded-xl",
    "max-w-md",
    "break-words",
    "fade-in",
    "shadow-md"
  );

  if (sender === "user") {
    message.classList.add(
      "user-message",
      "bg-gray-700",
      "text-white",
      "self-end"
    );
    message.innerText = text;
  } else {
    message.classList.add(
      "bot-message",
      "bg-gray-200",
      "text-black",
      "self-start"
    );

    if (isHTML) {
      message.innerHTML = ""; // Typing effect placeholder
      chatContainer.appendChild(message);
      typeMessage(message, marked.parse(text));
      return;
    } else {
      message.innerText = text;
    }
  }

  chatContainer.appendChild(message);
  message.scrollIntoView({ behavior: "smooth", block: "end" });
}

function typeMessage(container, fullHTML, speed = 8) {
  let i = 0;
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = fullHTML;
  const rawText = tempDiv.innerText;
  container.innerHTML = "";

  const interval = setInterval(() => {
    if (i <= rawText.length) {
      container.innerText = rawText.slice(0, i);
      i++;
    } else {
      clearInterval(interval);
      container.innerHTML = fullHTML;
    }
  }, speed);
}

async function sendMessage() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  addMessage("user", prompt);
  promptInput.value = "";
  addMessage("bot", "⏳ Thinking...");

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: preloadDocs + "\n\n" + prompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      `Error code: ${data.error?.code} ~ ${
        data.error?.message || "⚠️ Error fetching response."
      }`;

    chatContainer.lastChild.remove();
    addMessage("bot", reply, true);
  } catch (err) {
    chatContainer.lastChild.remove();
    addMessage("bot", "⚠️ Error fetching response.");
    console.error(err);
  }
}

// Speech recognition (voice to text) setup
let recognition;
let isRecognizing = false;

if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalTranscript = "";

  recognition.onstart = () => {
    isRecognizing = true;
    document.getElementById("micBtn").classList.add("mic-active");
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    stopRecognition();
  };

  recognition.onend = () => {
    isRecognizing = false;
    document.getElementById("micBtn").classList.remove("mic-active");

    // Auto-submit when silence detected
    if (finalTranscript.trim() !== "") {
      promptInput.value = finalTranscript;
      sendMessage();
      finalTranscript = "";
    }
  };

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + " ";
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    promptInput.value = finalTranscript + interim;
  };
}

document.getElementById("micBtn").addEventListener("click", () => {
  if (!isRecognizing) {
    finalTranscript = "";
    recognition.start();
    micBtn.classList.add("mic-pulse");
    micBtn.classList.add("bg-blue-800");
  } else {
    stopRecognition();
  }
});

function stopRecognition() {
  if (recognition && isRecognizing) {
    recognition.stop();
    micBtn.classList.remove("mic-pulse");

    micBtn.classList.remove("bg-blue-800");
  }
}
