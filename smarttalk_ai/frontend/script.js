

/* =====================================================
   SMARTTALK AI
   CHAT + PRODUCT IMAGES + VOICE + AUDIO/VIDEO LIBRARY
===================================================== */

const API_BASE_URL = "http://127.0.0.1:8000";

// =====================================================
// DOM ELEMENTS
// =====================================================

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");

const micButton = document.getElementById("mic-button");
const voiceStatus = document.getElementById("voice-status");
const voiceLanguage = document.getElementById("voice-language");

const voiceButton = document.getElementById("voice-button");
const stopVoiceButton = document.getElementById("stop-voice-button");
const pauseVoiceButton = document.getElementById("pause-voice-button");
const resumeVoiceButton = document.getElementById("resume-voice-button");
const muteVoiceButton = document.getElementById("mute-voice-button");
const voicePlaybackStatus = document.getElementById("voice-playback-status");

const audioInput = document.getElementById("audio-input");
const videoInput = document.getElementById("video-input");

const mediaLibrary = document.getElementById("video-library");
const mediaStatus = document.getElementById("media-status");
const mediaSearch = document.getElementById("media-search");
const mediaFilter = document.getElementById("media-filter");
const refreshMediaButton = document.getElementById("refresh-media-button");

let latestAnswer = "";
let recognition = null;
let isRecording = false;
let mediaItems = [];
let voiceMuted = false;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function setMediaStatus(message, isError = false) {
    if (!mediaStatus) return;

    mediaStatus.textContent = message;
    mediaStatus.style.color = isError ? "#d7475d" : "";
}

function updatePlaybackStatus(message) {
    if (voicePlaybackStatus) {
        voicePlaybackStatus.textContent = message;
    }
}

function getMediaUrl(item) {
    if (item.url) {
        if (
            item.url.startsWith("http://") ||
            item.url.startsWith("https://")
        ) {
            return item.url;
        }

        return `${API_BASE_URL}${item.url.startsWith("/") ? "" : "/"}${item.url}`;
    }

    return `${API_BASE_URL}/media/file/${encodeURIComponent(item.kind)}/${encodeURIComponent(item.filename)}`;
}

function formatFileSize(bytes) {
    const size = Number(bytes) || 0;

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// =====================================================
// CHAT MESSAGE
// =====================================================

function addMessage(text, sender = "assistant") {
    const message = document.createElement("div");

    message.className = sender === "user"
        ? "message user-message"
        : "message assistant-message";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = sender === "user" ? "You" : "✦";

    const content = document.createElement("div");
    content.className = "message-content";

    const senderName = document.createElement("div");
    senderName.className = "message-sender";
    senderName.textContent = sender === "user" ? "You" : "SmartTalk AI";

    const messageText = document.createElement("div");
    messageText.className = "message-text";
    messageText.textContent = text;

    content.appendChild(senderName);
    content.appendChild(messageText);

    if (sender === "user") {
        message.appendChild(content);
        message.appendChild(avatar);
    } else {
        message.appendChild(avatar);
        message.appendChild(content);
    }

    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;

    return message;
}


// =====================================================
// PROFESSIONAL ANSWER FORMAT
// =====================================================


    
function addFormattedMessage(text) {
    const message = addMessage("", "assistant");
    const container = message.querySelector(".message-text");

    container.textContent = "";

    const lines = text.split("\n");

    const comparisonTitle = lines.find(line =>
        /^\s*Comparison:/i.test(line)
    );

    const modelMatch = comparisonTitle
        ? comparisonTitle.match(/^Comparison:\s*(.+?)\s+vs\s+(.+)$/i)
        : null;

    function createHeading(tag, content) {
        const heading = document.createElement(tag);
        heading.textContent = content;
        container.appendChild(heading);
    }

    function createTable(headers, className = "product-spec-table") {
        const wrapper = document.createElement("div");
        wrapper.className = "comparison-table-wrapper";

        const table = document.createElement("table");
        table.className = className;

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        headers.forEach(header => {
            const th = document.createElement("th");
            th.textContent = header;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);

        const tbody = document.createElement("tbody");

        table.appendChild(thead);
        table.appendChild(tbody);
        wrapper.appendChild(table);
        container.appendChild(wrapper);

        return tbody;
    }

    function addRow(tbody, values) {
        const row = document.createElement("tr");

        values.forEach((value, index) => {
            const cell = document.createElement(index === 0 ? "th" : "td");
            cell.textContent = value || "Not listed in catalog";
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    }

    // =========================================
    // COMPARISON ANSWER
    // =========================================

    if (modelMatch) {
        const firstModel = modelMatch[1].trim();
        const secondModel = modelMatch[2].trim();

        createHeading("h3", comparisonTitle.trim());

        const comparisonBody = createTable([
            "Specification",
            firstModel,
            secondModel
        ], "product-spec-table comparison-table");

        let currentSpecification = "";
        let firstValue = "";
        let secondValue = "";

        function saveComparisonRow() {
            if (!currentSpecification) return;

            addRow(comparisonBody, [
                currentSpecification,
                firstValue || "Not listed in catalog",
                secondValue || "Not listed in catalog"
            ]);

            currentSpecification = "";
            firstValue = "";
            secondValue = "";
        }

        lines.forEach(line => {
            const value = line.trim();

            if (!value) return;

            if (/^Series:/i.test(value)) {
                saveComparisonRow();

                const paragraph = document.createElement("p");
                paragraph.textContent = value;
                container.appendChild(paragraph);
                return;
            }


            const modelValue = value.match(/^•\s*(.*?)\s*:\s*(.*)$/);

            if (modelValue) {
                const modelName = modelValue[1].trim();
                const specificationValue = modelValue[2].trim();

                if (modelName.toLowerCase() === firstModel.toLowerCase()) {
                    firstValue = specificationValue;
                }

                if (modelName.toLowerCase() === secondModel.toLowerCase()) {
                    secondValue = specificationValue;
                }

                return;
            }

            if (/^Comparison:/i.test(value)) return;

            if (/^#{1,4}\s/.test(value)) return;

            // New specification name
            if (!value.startsWith("|")) {
                saveComparisonRow();
                currentSpecification = value;
            }
        });

        saveComparisonRow();

    } else {
        // =========================================
        // NORMAL PRODUCT ANSWER
        // =========================================

        let titleAdded = false;
        let inHighlights = false;
        let productBody = null;

        lines.forEach(line => {
            const value = line.trim();

            if (!value) return;

            if (/^Series highlights:?$/i.test(value)) {
                inHighlights = true;
                createHeading("h3", "Series Highlights");
                return;
            }

            if (inHighlights && value.startsWith("•")) {
                const item = document.createElement("p");
                item.textContent = value;
                container.appendChild(item);
                return;
            }

            if (value.startsWith("|")) {
                const cells = value
                    .split("|")
                    .slice(1, -1)
                    .map(cell => cell.trim());

                if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) {
                    return;
                }

                if (!productBody && cells.length >= 2) {
                    createHeading("h4", "Product Specifications");
                    productBody = createTable(
                        ["Specification", "Details"]
                    );
                }

                if (productBody && cells.length >= 2) {
                    addRow(productBody, [cells[0], cells[1]]);
                }

                return;
            }

            if (/^#{1,4}\s/.test(value)) {
                createHeading("h4", value.replace(/^#{1,4}\s*/, ""));
                return;
            }

            if (!titleAdded && !value.startsWith("Series:")) {
                createHeading("h3", value);
                titleAdded = true;
                return;
            }

            if (/^Series:/i.test(value)) {
                const paragraph = document.createElement("p");
                paragraph.textContent = value;
                container.appendChild(paragraph);
            }
            // Display normal product specifications
const specMatch = value.match(/^([^:]+):\s*(.+)$/);

if (specMatch) {
    if (!productBody) {
        createHeading("h4", "Product Specifications");
        productBody = createTable(["Specification", "Details"]);
    }

    addRow(productBody, [
        specMatch[1].trim(),
        specMatch[2].trim()
    ]);

    return;
}
        });
    }

    chatBox.scrollTop = chatBox.scrollHeight;
    return message;
}

function showTyping() {
    const typing = addMessage("SmartTalk AI is thinking...", "assistant");
    typing.classList.add("typing-message");
    return typing;
}

// =====================================================
// PRODUCT IMAGES
// =====================================================

function displayProductImages(images) {
    if (!Array.isArray(images) || images.length === 0) return;

    const section = document.createElement("section");
    section.className = "product-images-section";

    const heading = document.createElement("h3");
    heading.className = "product-images-heading";
    heading.textContent = "Product Images";

    const grid = document.createElement("div");
    grid.className = "product-images-grid";

    images.forEach(image => {
        const imageUrl = typeof image === "string"
            ? image
            : (image.url || image.image_url || image.src || "");

        const imageName = typeof image === "string"
            ? "Company Product"
            : (image.name || image.title || image.model || "Company Product");

        if (!imageUrl) return;

        const card = document.createElement("div");
        card.className = "product-image-card";

        const img = document.createElement("img");

        img.src = imageUrl.startsWith("http")
            ? imageUrl
            : `${API_BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;

        img.alt = imageName;
        img.loading = "lazy";
        img.title = "Click to open full size";
        img.style.cursor = "zoom-in";
        img.addEventListener("click", () => window.open(img.src, "_blank"));

        const name = document.createElement("div");
        name.className = "product-image-name";
        name.textContent = imageName;

        card.appendChild(img);
        card.appendChild(name);
        grid.appendChild(card);
    });

    if (!grid.children.length) return;

    section.appendChild(heading);
    section.appendChild(grid);
    chatBox.appendChild(section);

    chatBox.scrollTop = chatBox.scrollHeight;
}

// =====================================================
// SOURCES
// =====================================================

function displaySources(sources) {
    if (!Array.isArray(sources) || sources.length === 0) return;

    const section = document.createElement("section");
    section.className = "source-section";

    const heading = document.createElement("div");
    heading.className = "source-heading";
    heading.textContent = "Information Sources";

    const list = document.createElement("div");
    list.className = "source-list";

    sources.forEach(source => {
        const item = document.createElement("span");
        item.className = "source-item";

        if (typeof source === "string") {
            item.textContent = source;
        } else {
            item.textContent = (source.name ||
                source.source ||
                source.filename ||
                "Company Catalog") + (source.page ? ` - Page ${source.page}` : "");
        }

        list.appendChild(item);
    });

    section.appendChild(heading);
    section.appendChild(list);
    chatBox.appendChild(section);

    chatBox.scrollTop = chatBox.scrollHeight;
}

// =====================================================
// VOICE OUTPUT - CENTRALIZED CONTROLS
// =====================================================

function stopVoicePlayback() {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        updatePlaybackStatus("Voice stopped");
    }
}

function speakMessage(text) {
    if (!("speechSynthesis" in window)) {
        updatePlaybackStatus("Voice playback is not supported by this browser.");
        return;
    }

    if (!text) {
        updatePlaybackStatus("No answer available to play.");
        return;
    }

    const synth = window.speechSynthesis;

    // Stop any previous playback.
    synth.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = voiceLanguage?.value || "en-IN";
    speech.rate = 1;
    speech.pitch = 1;

    // Mute setting applies to this new playback.
    speech.volume = voiceMuted ? 0 : 1;

    speech.onstart = () => {
        updatePlaybackStatus(
            voiceMuted ? "Voice muted" : "Playing voice..."
        );
    };

    speech.onend = () => {
        updatePlaybackStatus("Voice finished");
    };

    speech.onerror = event => {
        if (event.error !== "canceled" && event.error !== "interrupted") {
            updatePlaybackStatus("Voice playback error");
            console.error("Voice playback error:", event.error);
        }
    };

    synth.speak(speech);
}

// Listen button
if (voiceButton) {
    voiceButton.addEventListener("click", () => {
        speakMessage(latestAnswer);
    });
}

// Pause button
if (pauseVoiceButton) {
    pauseVoiceButton.addEventListener("click", () => {
        const synth = window.speechSynthesis;

        if (synth.speaking && !synth.paused) {
            synth.pause();
            updatePlaybackStatus("Voice paused");
        }
    });
}

// Resume button
if (resumeVoiceButton) {
    resumeVoiceButton.addEventListener("click", () => {
        const synth = window.speechSynthesis;

        if (synth.paused) {
            synth.resume();
            updatePlaybackStatus("Voice resumed");
        }
    });
}

// Stop button
if (stopVoiceButton) {
    stopVoiceButton.addEventListener("click", stopVoicePlayback);
}

// Mute / Unmute button
if (muteVoiceButton) {
    muteVoiceButton.addEventListener("click", () => {
        voiceMuted = !voiceMuted;

        muteVoiceButton.textContent = voiceMuted
            ? "🔊 Unmute"
            : "🔇 Mute";

        updatePlaybackStatus(
            voiceMuted
                ? "Mute enabled for next playback"
                : "Mute disabled"
        );
    });
}

// =====================================================
// SEND CHAT MESSAGE
// =====================================================

async function sendMessage(question = null) {
    const message = (question ?? userInput.value).trim();

    if (!message) return;

    // Stop previous answer before starting a new question.
    stopVoicePlayback();

    addMessage(message, "user");

    userInput.value = "";
    sendButton.disabled = true;

    const typingMessage = showTyping();

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: message
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("SMARTTALK RAW ANSWER:", data.answer);

        typingMessage.remove();

        const answer = data.answer ||
            data.response ||
            "Sorry, I could not find an answer.";

        latestAnswer = answer;

        const customerAnswer = answer
   .replace(/\s*Catalog\s+page\s*:?\s*\d+\s*\|?/gi, " ")
   .replace(/\s*Source:\s*.*?\|\s*Page:\s*\d+/gi, " ")
   .trim();

    
    
     const formattedAnswer = customerAnswer
    .replace(/\s+(?=Pixel Pitch:|Module Size:|Panel Size:|Panel Weight:|Refresh Rate:|Driving Mode \(Duty\):|Brightness:|Power Supply:|Receiving Card:|Max\/Average Power Consumption:|Working Temperature:|Best Viewing Distance:|Best Viewing Angle:|Lifetime:|IP Rating:)/gi, "\n")
    .replace(/\s*Series highlights\s*:/gi, "\n\n\nSeries highlights:");



    addFormattedMessage(formattedAnswer);

        if (data.images) {
            displayProductImages(data.images);
        }

        

    } catch (error) {
        typingMessage.remove();

        console.error("Chat error:", error);

        addMessage(
            "Unable to connect to SmartTalk AI. Please check that the backend server is running.",
            "assistant"
        );

    } finally {
        sendButton.disabled = false;
        userInput.focus();
    }
}

sendButton.addEventListener("click", () => sendMessage());

userInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        sendMessage();
    }
});

// =====================================================
// QUICK QUESTIONS
// =====================================================

document.querySelectorAll(".suggestion-chip").forEach(button => {
    button.addEventListener("click", () => {
        const question = button.dataset.question;

        if (question) {
            sendMessage(question);
        }
    });
});

// =====================================================
// VOICE INPUT - MICROPHONE
// =====================================================

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition && micButton) {
    recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = voiceLanguage?.value || "en-IN";

    recognition.onstart = () => {
        isRecording = true;

        micButton.classList.add("recording");

        if (voiceStatus) {
            voiceStatus.textContent = "Listening...";
            voiceStatus.classList.add("active");
        }
    };

    recognition.onresult = event => {
        const transcript = event.results[0][0].transcript;

        userInput.value = transcript;

        if (voiceStatus) {
            voiceStatus.textContent = "Voice captured successfully.";
        }

        sendMessage(transcript);
    };

    recognition.onerror = event => {
        console.error("Voice input error:", event.error);

        if (voiceStatus) {
            voiceStatus.textContent =
                "Voice input error. Please try again.";
        }
    };

    recognition.onend = () => {
        isRecording = false;

        micButton.classList.remove("recording");

        if (voiceStatus) {
            voiceStatus.classList.remove("active");
        }
    };

    micButton.addEventListener("click", () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.lang = voiceLanguage?.value || "en-IN";

            try {
                recognition.start();
            } catch (error) {
                console.error("Microphone start error:", error);
            }
        }
    });

    if (voiceLanguage) {
        voiceLanguage.addEventListener("change", () => {
            recognition.lang = voiceLanguage.value;
        });
    }

} else if (micButton) {
    micButton.disabled = true;
    micButton.title = "Voice input is not supported in this browser.";

    if (voiceStatus) {
        voiceStatus.textContent =
            "Voice input is not supported in this browser.";
    }
}

// =====================================================
// MEDIA LIBRARY - LOAD
// =====================================================

async function loadMedia() {
    if (!mediaLibrary) return;

    mediaLibrary.innerHTML = `
        <div class="video-empty-state">
            <span>⟳</span>
            <p>Loading media library...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/media/list`);

        if (!response.ok) {
            throw new Error("Could not load media library.");
        }

        const data = await response.json();

        mediaItems = Array.isArray(data)
            ? data
            : (data.items || []);

        renderMediaLibrary();

        setMediaStatus(`${mediaItems.length} media file(s) available.`);

    } catch (error) {
        console.error("Media loading error:", error);

        mediaLibrary.innerHTML = `
            <div class="video-empty-state">
                <span>!</span>
                <p>Unable to load media library</p>
                <small>Check that the backend is running.</small>
            </div>
        `;

        setMediaStatus("Could not connect to media library.", true);
    }
}

// =====================================================
// MEDIA LIBRARY - DISPLAY
// =====================================================

function renderMediaLibrary() {
    if (!mediaLibrary) return;

    const searchText = (mediaSearch?.value || "").toLowerCase();
    const filterType = mediaFilter?.value || "all";

    const filteredItems = mediaItems.filter(item => {
        const title = (item.title || item.filename || "").toLowerCase();

        const matchesSearch = title.includes(searchText);
        const matchesType = filterType === "all" ||
            item.kind === filterType;

        return matchesSearch && matchesType;
    });

    mediaLibrary.innerHTML = "";

    if (filteredItems.length === 0) {
        mediaLibrary.innerHTML = `
            <div class="video-empty-state">
                <span>♫</span>
                <p>No media files found</p>
                <small>Upload a file or change your search.</small>
            </div>
        `;
        return;
    }

    filteredItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "video-card";

        const url = getMediaUrl(item);
        const title = item.title || item.filename || "Media File";

        if (item.kind === "video") {
            const video = document.createElement("video");

            video.src = url;
            video.controls = true;
            video.preload = "metadata";
            video.playsInline = true;

            card.appendChild(video);

        } else if (item.kind === "audio") {
            const audio = document.createElement("audio");

            audio.src = url;
            audio.controls = true;
            audio.preload = "metadata";
            audio.style.width = "100%";
            audio.style.padding = "12px";

            card.appendChild(audio);
        }

        const info = document.createElement("div");
        info.className = "video-card-info";

        const titleElement = document.createElement("div");
        titleElement.className = "video-card-title";
        titleElement.textContent = title;

        const details = document.createElement("small");
        details.textContent =
            `${String(item.kind || "media").toUpperCase()} · ${formatFileSize(item.size_bytes)}`;

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "remove-video-button";
        deleteButton.textContent = "Delete file";

        deleteButton.addEventListener("click", () => {
            deleteMedia(item.id);
        });

        info.appendChild(titleElement);
        info.appendChild(details);
        info.appendChild(deleteButton);

        card.appendChild(info);
        mediaLibrary.appendChild(card);
    });
}

// =====================================================
// MEDIA UPLOAD
// =====================================================

async function uploadMedia(files, kind) {
    if (!files || files.length === 0) return;

    const maxSize = kind === "audio"
        ? 50 * 1024 * 1024
        : 200 * 1024 * 1024;

    for (const file of files) {
        if (file.size > maxSize) {
            setMediaStatus(
                `${file.name} is too large. Maximum ${kind} size is ${kind === "audio" ? "50 MB" : "200 MB"}.`,
                true
            );

            continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        setMediaStatus(`Uploading ${file.name}...`);

        try {
            const response = await fetch(
                `${API_BASE_URL}/media/upload?kind=${kind}`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Upload failed.");
            }

            setMediaStatus(`${file.name} uploaded successfully.`);

        } catch (error) {
            console.error("Upload error:", error);

            setMediaStatus(
                `Upload failed for ${file.name}: ${error.message}`,
                true
            );
        }
    }

    await loadMedia();
}

if (audioInput) {
    audioInput.addEventListener("change", event => {
        uploadMedia(event.target.files, "audio");
        event.target.value = "";
    });
}

if (videoInput) {
    videoInput.addEventListener("change", event => {
        uploadMedia(event.target.files, "video");
        event.target.value = "";
    });
}

// =====================================================
// MEDIA DELETE
// =====================================================

async function deleteMedia(mediaId) {
    if (!mediaId) {
        setMediaStatus("Media ID is missing.", true);
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to delete this media file?"
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${API_BASE_URL}/media/${encodeURIComponent(mediaId)}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Delete failed.");
        }

        setMediaStatus("Media deleted successfully.");

        await loadMedia();

    } catch (error) {
        console.error("Delete error:", error);
        setMediaStatus(error.message, true);
    }
}

// =====================================================
// MEDIA SEARCH, FILTER AND REFRESH
// =====================================================

if (mediaSearch) {
    mediaSearch.addEventListener("input", renderMediaLibrary);
}

if (mediaFilter) {
    mediaFilter.addEventListener("change", renderMediaLibrary);
}

if (refreshMediaButton) {
    refreshMediaButton.addEventListener("click", loadMedia);
}

// =====================================================
// INITIALIZE
// =====================================================

loadMedia();

console.log("SmartTalk AI initialized successfully.");


// =====================================================
// OPTIONAL AI MEDIA ANALYSIS (requires server-side API key)
// =====================================================
async function runMediaAnalysis({inputId, questionId, buttonId, resultId, endpoint, includeQuestion}) {
    const input = document.getElementById(inputId);
    const question = questionId ? document.getElementById(questionId) : null;
    const button = document.getElementById(buttonId);
    const result = document.getElementById(resultId);
    if (!input || !button || !result) return;

    button.addEventListener("click", async () => {
        const file = input.files && input.files[0];
        if (!file) {
            result.textContent = "Please select a file first.";
            return;
        }
        const form = new FormData();
        form.append("file", file);
        if (includeQuestion && question) form.append("question", question.value.trim());
        button.disabled = true;
        result.textContent = "Processing...";
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {method: "POST", body: form});
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Media analysis failed.");
            result.textContent = data.answer || data.text || "No result returned.";
        } catch (error) {
            result.textContent = error.message || "Could not analyze this file.";
        } finally {
            button.disabled = false;
        }
    });
}

runMediaAnalysis({inputId:"image-analysis-input", questionId:"image-analysis-question", buttonId:"analyze-image-button", resultId:"image-analysis-result", endpoint:"/ai/analyze-image", includeQuestion:true});
runMediaAnalysis({inputId:"audio-analysis-input", buttonId:"transcribe-audio-button", resultId:"audio-analysis-result", endpoint:"/ai/transcribe-audio", includeQuestion:false});
runMediaAnalysis({inputId:"video-analysis-input", questionId:"video-analysis-question", buttonId:"analyze-video-button", resultId:"video-analysis-result", endpoint:"/ai/analyze-video", includeQuestion:true});
