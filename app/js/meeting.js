let currentLeadId = null;

// Zoho PageLoad event: Get Lead ID from context
ZOHO.embeddedApp.on("PageLoad", function (data) {
  if (data && data.Entity === "Leads") {
    currentLeadId = data.EntityId;
    console.log("Lead ID:", currentLeadId);
  } else {
    console.warn("This widget should be opened from a Lead record.");
  }
});

// Handle form submission for meeting creation
document
  .getElementById("zoomForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    console.log("Form submitted");

    const topic = document.getElementById("topic").value;
    const startTime = new Date(
      document.getElementById("startTime").value
    ).toISOString();
    const duration = parseInt(document.getElementById("duration").value);
    const agenda = document.getElementById("agenda").value;

    const payload = {
      Meeting_Name: topic,
      duration: duration,
      Weekly_Sync_up: agenda,
      start_time: startTime,
    };

    console.log("Payload:", payload);

    const resultDiv = document.getElementById("result");
    resultDiv.classList.remove("hidden");

    try {
      const response = await ZOHO.CRM.CONNECTOR.invokeAPI(
        "talentrankerx.zoomcrmmeetingstracker.createmeeting",
        payload
      );
      console.log("Meeting Created:", response);

      const parsed = JSON.parse(response.response);
      const joinUrl = parsed.join_url;

      resultDiv.innerHTML = `
      <strong class="block mb-2">Meeting Created Successfully!</strong>
      <span>Join URL: <a class="text-blue-600 underline" href="${joinUrl}" target="_blank">${joinUrl}</a></span>
    `;

      if (currentLeadId) {
        await updateLeadJoinUrl(currentLeadId, joinUrl, duration, startTime);
      } else {
        console.warn("No Lead ID found, lead not updated.");
      }
    } catch (error) {
      console.error("Error creating Zoom Meeting:", error);
      resultDiv.innerHTML = `<span class="text-red-600"><strong>Error:</strong> ${JSON.stringify(
        error
      )}</span>`;
    }
  });

async function updateLeadJoinUrl(leadId, joinUrl, duration, startTime) {
  try {
    const date = new Date(startTime);
    const offsetMinutes = date.getTimezoneOffset();
    const localISO = new Date(date.getTime() - offsetMinutes * 60000)
      .toISOString()
      .slice(0, 19);
    const formattedDate = `${localISO}+05:30`;

    const response = await ZOHO.CRM.API.updateRecord({
      Entity: "Leads",
      APIData: [
        {
          id: leadId,
          talentrankerx__Duration: Number(duration),
          talentrankerx__Meeting_Schedule: formattedDate,
          talentrankerx__Join_URL: joinUrl,
        },
      ],
      Trigger: ["workflow"],
    });

    console.log("Lead updated with Join URL:", response);
  } catch (err) {
    console.error("Failed to update lead:", err);
  }
}

// Initialize Zoho Embedded App SDK
ZOHO.embeddedApp.init();
