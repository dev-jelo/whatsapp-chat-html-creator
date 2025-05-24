const sourceText = await Bun.file(`${import.meta.dir}/chat.txt`).text();

interface Message {
  date: string;
  time: string;
  message: {
    sender: string;
    text: string;
  };
}

const messagesArray: Message[] = [];

const sourceTextLines = sourceText.split("\r");

if (sourceTextLines.length <= 1) {
  console.error("Source chat file is empty");
  process.exit(1);
}

/** Find the two names of the chat */

// The first line will always contain the first name
const nameOne = sourceTextLines[0].split("-")[1].split(":")[0].trim();

let nameTwo: string = "";
for (let i = 1; i < sourceTextLines.length; i++) {
  const isMessage = sourceTextLines[i].match(/\d+\/\d+\/\d+, \d+:\d+ - /);

  const nameOfSender = sourceTextLines[i].split("-")[1].split(":")[0].trim();
  if (isMessage && nameOfSender !== nameOne) {
    nameTwo = nameOfSender;
    break;
  }
}

const confirmNames = await getUserInput(
  `The two people in the chat are "${nameOne}" and "${nameTwo}", is this correct? Y/N: `
);

if (confirmNames !== "Y" && confirmNames !== "y") {
  console.error(
    "Detected names in chat are incorrect. Please check the chat.txt file."
  );
  process.exit(1);
}

// Who the chat perspective should be from, i.e. what it would look
// like from this person's phone.
let chatPerspective: string = "";
const confirmChatPerspective = await getUserInput(
  `Whose perspective should the output file be in? (1) ${nameOne} (2) ${nameTwo}: `
);

if (confirmChatPerspective === "1") {
  chatPerspective = nameOne;
} else if (confirmChatPerspective === "2") {
  chatPerspective = nameTwo;
}

// Handle wrong inputs
while (confirmChatPerspective !== "1" && confirmChatPerspective !== "2") {
  console.error("Please enter 1 or 2");
  const confirmChatPerspectiveAgain = await getUserInput(
    `Whose perspective should the output file be in? (1) ${nameOne} (2) ${nameTwo}: `
  );
  if (confirmChatPerspectiveAgain === "1") {
    chatPerspective = nameOne;
    break;
  } else if (confirmChatPerspectiveAgain === "2") {
    chatPerspective = nameTwo;
    break;
  }
}

sourceTextLines.forEach((x) => {
  const isNewMessage = x.match(/\d+\/\d+\/\d+, \d+:\d+ - /);

  if (x.length === 1) {
    messagesArray[messagesArray.length - 1].message.text += "\n";
    return;
  }

  if (!isNewMessage) {
    messagesArray[messagesArray.length - 1].message.text += x;
    return;
  }

  const indexOfDash = x.indexOf("-");

  const dateAndTime = x.slice(0, indexOfDash).split(",");
  let date = dateAndTime[0];
  if (date) {
    date = date.trim();
  }
  let time = dateAndTime[1];
  if (time) {
    time = time.trim();
  }

  const message = x.slice(indexOfDash + 2);

  const indexOfColon = message.indexOf(":");
  let sender = message.slice(0, indexOfColon);

  const text = message.slice(indexOfColon + 2);

  messagesArray.push({ date, time, message: { sender, text } });
});

if (!messagesArray[messagesArray.length - 1].time) {
  messagesArray.pop();
}
let date = messagesArray[0].date;

let finalHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
      rel="stylesheet"
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap"
      rel="stylesheet"
    />
    <style>
      body {
        background-image: url("assets/whatsapp-bg.png");
        font-family: "Open Sans", "Noto Color Emoji", sans-serif;
        display: flex;
        font-size: large;
        flex-direction: column;
      }
      p {
        margin: 8px 0px;
      }
      .date {
        align-self: center;
        color: gray;
        background-color: #dbf3fb;
        border-radius: 5px;
        margin: 3px;
        padding: 5px 20px;
        text-transform: uppercase;
      }
      .speech-bubble-container {
        padding: 2px 0;
        display: flex;
      }
      .my-speech-bubble-container {
        justify-content: end;
      }
      .speech-bubble {
        border-radius: 10px;
        display: inline-flex;
        max-width: 80%;
        padding: 0 13px;
        position: relative;
      }
      .my-speech-bubble {
        align-self: end;
        background-color: #e2ffc7;
        margin-right: 1rem;
      }
      .partner-speech-bubble {
        align-self: start;
        background-color: white;
        margin-left: 1rem;
      }
      .speech-bubble-arrow {
        height: 15px;
        position: absolute;
        width: 15px;
      }
      .my-speech-bubble-arrow {
        right: -8px;
      }
      .partner-speech-bubble-arrow {
        left: -8px;
      }
      .time {
        color: rgb(175, 175, 175);
        display: inline;
        float: right;
        font-size: medium;
        margin-left: 10px;
        padding-bottom: 1px;
        position: relative;
        top: 8px;
      }

      @media print {
        .speech-bubble, .date {
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
  <div class="date">${convertToDateFormat(date)}</div>`;

// Used to determine if chat bubble arrow should be added.
// It is added for the first message in a series of messages from
// the same person.
// Set this to be the opposite of the first message sender so that
// the first message will have an arrow.
let currentMessageSender =
  messagesArray[0].message.sender === chatPerspective
    ? nameTwo
    : chatPerspective;

// This is to force add a speech bubble arrow if the message is after a
// date block
let addSpeechBubbleArrow = false;

messagesArray.forEach((message) => {
  // Add date block
  if (message.date !== date) {
    finalHTML += `<div class="date">${convertToDateFormat(date)}</div>`;
    date = message.date;
    addSpeechBubbleArrow = true;
  } else {
    addSpeechBubbleArrow = false;
  }

  finalHTML += `<div class="speech-bubble-container ${
    message.message.sender === chatPerspective && "my-speech-bubble-container"
  }"><div class="speech-bubble ${
    message.message.sender === chatPerspective
      ? "my-speech-bubble"
      : "partner-speech-bubble"
  }">`;

  // Add speech bubble arrow
  if (message.message.sender !== currentMessageSender || addSpeechBubbleArrow) {
    finalHTML += `<img
        src="./assets/bubble-${
          message.message.sender === chatPerspective ? "right" : "left"
        }-arrow.svg"
        class="speech-bubble-arrow ${
          message.message.sender === chatPerspective ? "my" : "partner"
        }-speech-bubble-arrow"
      />`;
  }

  currentMessageSender = message.message.sender;

  const messageTextIncludingNewlines = message.message.text.replaceAll(
    "\n",
    "<br>"
  );

  finalHTML += `<p>${
    message.message.text === "<Media omitted>"
      ? "<i>An image is supposed to be here but I could't figure out how to add it :(</i>"
      : messageTextIncludingNewlines
  }<span class="time">${message.time}</span></p></div></div>`;
});

finalHTML += "</body></html>";

console.log("Created output.html");

// Write to output HTML file
await Bun.write(`${import.meta.dir}/output.html`, finalHTML);

/**
 * Convert from dd/m/yy to d mmmm 20yy
 */
function convertToDateFormat(date: string) {
  const months: Record<number, string> = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  };

  const dateSplit: string[] = date.split("/");

  return `${dateSplit[0]} ${months[Number(dateSplit[1])]} 20${dateSplit[2]}`;
}

/**
 * Get user input.
 */
async function getUserInput(query: string): Promise<string> {
  process.stdout.write(query);

  const iterator = console[Symbol.asyncIterator]();
  const result = await iterator.next();
  // Call `return` on the iterator to signal that no more input
  // is expected and allow the process to exit.
  await iterator.return?.();

  return result.value.toString().trim();
}
