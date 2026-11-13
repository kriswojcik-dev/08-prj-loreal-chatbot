/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Send requests to the deployed Cloudflare Worker, not directly to OpenAI.
const API_URL = "https://loreal-worker.kwojcik4.workers.dev/";

// This instruction keeps the chatbot focused on L'Oréal beauty questions.
const systemPrompt =
  "You are a helpful L'Oréal beauty assistant. Only answer questions about L'Oréal products and brands, skincare, makeup, haircare, fragrances, beauty routines, product comparisons, recommendations, and other beauty-related guidance. If a question is unrelated to L'Oréal or beauty, do not answer the unrelated question. Instead, politely say that you can only help with L'Oréal products, routines, recommendations, and beauty topics, then invite the user to ask a relevant question. Do not invent product details; say when you are unsure.";

// Keep the conversation so the assistant can remember earlier messages.
const messages = [{ role: "system", content: systemPrompt }];

// Add bold text and clickable links while keeping the response safe from HTML injection.
function addFormattedText(parent, text) {
  const markdownPattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = markdownPattern.exec(text)) !== null) {
    parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));

    if (match[2] && match[3]) {
      const link = document.createElement("a");
      link.href = match[3];
      link.textContent = match[2];
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      parent.appendChild(link);
    } else {
      const boldText = document.createElement("strong");
      boldText.textContent = match[5];
      parent.appendChild(boldText);
    }

    lastIndex = markdownPattern.lastIndex;
  }

  parent.appendChild(document.createTextNode(text.slice(lastIndex)));
}

// Add a message to the chat window without treating it as HTML.
function displayMessage(role, content) {
  const message = document.createElement("p");
  message.className = `msg ${role}`;

  if (role === "ai") {
    const lines = content.split("\n");
    let bulletList;

    lines.forEach((line) => {
      const heading = line.trim().match(/^#{1,6}\s+(.+)$/);
      if (heading) {
        bulletList = null;
        const headingElement = document.createElement("div");
        headingElement.className = "response-heading";
        addFormattedText(headingElement, heading[1]);
        message.appendChild(headingElement);
        return;
      }

      if (line.trim().startsWith("- ")) {
        if (!bulletList) {
          bulletList = document.createElement("ul");
          message.appendChild(bulletList);
        }

        const bullet = document.createElement("li");
        addFormattedText(bullet, line.trim().slice(2));
        bulletList.appendChild(bullet);
        return;
      }

      bulletList = null;
      const paragraph = document.createElement("div");
      addFormattedText(paragraph, line);
      message.appendChild(paragraph);
    });
  } else {
    message.textContent = content;
  }

  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Set the initial message.
displayMessage("ai", "👋 Hello! How can I help you today?");

// Send the user's message to the Cloudflare Worker.
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  // Show only the latest question and its response in the chat window.
  chatWindow.textContent = "";
  displayMessage("user", message);
  messages.push({ role: "user", content: message });
  userInput.value = "";

  const sendButton = document.getElementById("sendBtn");
  sendButton.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("The API returned no chatbot response.");
    }

    messages.push({ role: "assistant", content: reply });
    displayMessage("ai", reply);
  } catch (error) {
    console.error("Unable to get a chatbot response:", error);
    displayMessage(
      "ai",
      "Sorry, I could not connect right now. Please try again.",
    );
  } finally {
    sendButton.disabled = false;
    userInput.focus();
  }
});
