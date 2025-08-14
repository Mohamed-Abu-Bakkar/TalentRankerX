let leadId,
  githubId,
  leetcodeId,
  chartInstance,
  statsGlobal = {};

// Zoho PageLoad event: Get Lead ID and fetch candidate info
ZOHO.embeddedApp.on("PageLoad", async function (data) {
  leadId = typeof data?.EntityId == "object" ? data.EntityId[0] : data.EntityId;
  if (!leadId) return;

  // Fetch Lead record from Zoho CRM
  let response = await ZOHO.CRM.API.getRecord({
    Entity: "Leads",
    RecordID: leadId,
  });
  let lead = response.data?.[0] || {};
  githubId = lead.talentrankerx__GitHub_ID || "";
  leetcodeId = lead.talentrankerx__LeetCode_ID || "";
  let name = lead.Full_Name || lead.Name || "N/A";
  let email = lead.Email || "N/A";

  // Display candidate info
  document.getElementById("leadInfo").innerHTML = `
    <div class="space-y-1">
      <p><strong class="text-blue-400">Name:</strong> ${name}</p>
      <p><strong class="text-blue-400">Email:</strong> ${email}</p>
      <p><strong class="text-blue-400">GitHub:</strong> ${githubId}</p>
      <p><strong class="text-blue-400">LeetCode:</strong> ${leetcodeId}</p>
    </div>
  `;

  // Fetch and display candidate stats
  let stats = await fetchCandidateStats(githubId, leetcodeId);
  statsGlobal = stats;
  document.getElementById("statsInfo").innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-3 gap-y-2">
      <div class="col-span-2 md:col-span-3 flex justify-center items-center mb-2">
        <span class="inline-block bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 text-white font-bold text-2xl px-6 py-2 rounded-xl shadow-lg border-2 border-blue-400 tracking-wide">
          TalentRankerX Score: ${stats.score}
        </span>
      </div>
      <p><strong class="text-blue-600">GitHub Repos:</strong> ${stats.githubRepos}</p>
      <p><strong class="text-blue-600">GitHub Stars:</strong> ${stats.githubStars}</p>
      <p><strong class="text-blue-600">GitHub Followers:</strong> ${stats.githubFollowers}</p>
      <p><strong class="text-blue-600">LeetCode Easy:</strong> ${stats.leetcodeEasy}</p>
      <p><strong class="text-blue-600">LeetCode Medium:</strong> ${stats.leetcodeMedium}</p>
      <p><strong class="text-blue-600">LeetCode Hard:</strong> ${stats.leetcodeHard}</p>
      <p><strong class="text-blue-600">Ranking:</strong> ${stats.Ranking}</p>
    </div>
  `;
});

ZOHO.embeddedApp.init();

// Fetch candidate stats
async function fetchCandidateStats(githubId, leetcodeId) {
  let stats = {
    githubRepos: 0,
    githubStars: 0,
    githubFollowers: 0,
    leetcodeEasy: 0,
    leetcodeMedium: 0,
    leetcodeHard: 0,
    Ranking: 0,
    score: 0,
  };

  // GitHub Stats
  if (githubId) {
    let userResp = await (
      await fetch(`https://api.github.com/users/${githubId}`)
    ).json();
    stats.githubFollowers = userResp.followers || 0;

    let repos = await (
      await fetch(
        `https://api.github.com/users/${githubId}/repos?sort=updated&per_page=100`
      )
    ).json();
    stats.githubRepos = repos.length;
    stats.githubStars = repos.reduce(
      (sum, repo) => sum + repo.stargazers_count,
      0
    );
  }

  // LeetCode Stats
  if (leetcodeId) {
    let lcQuery = {
      query: `query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          profile { ranking }
          submitStats { acSubmissionNum { difficulty count } }
        }
      }`,
      variables: { username: leetcodeId },
    };

    let proxyResp = await fetch("https://flexyproxy.onrender.com/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://leetcode.com/graphql",
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "*/*" },
        body: lcQuery,
      }),
    });

    let lcData = await proxyResp.json();
    let subs = lcData?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
    stats.leetcodeEasy = subs.find((s) => s.difficulty === "Easy")?.count || 0;
    stats.leetcodeMedium =
      subs.find((s) => s.difficulty === "Medium")?.count || 0;
    stats.leetcodeHard = subs.find((s) => s.difficulty === "Hard")?.count || 0;
    stats.Ranking = lcData?.data?.matchedUser?.profile?.ranking || 0;
  }

  // Scoring Logic
  stats.score =
    stats.githubRepos * 0.1 +
    stats.githubStars * 0.25 +
    stats.githubFollowers * 0.2 +
    stats.leetcodeEasy * 0.05 +
    stats.leetcodeMedium * 0.15 +
    stats.leetcodeHard * 0.25;

  // Update Zoho Lead record
  await ZOHO.CRM.API.updateRecord({
    Entity: "Leads",
    APIData: {
      id: leadId,
      talentrankerx__GitHub_Stats: `Repos: ${stats.githubRepos}, Stars: ${stats.githubStars}, Followers: ${stats.githubFollowers}`,
      talentrankerx__LeetCode_Stats: `Easy: ${stats.leetcodeEasy}, Medium: ${stats.leetcodeMedium}, Hard: ${stats.leetcodeHard}, Ranking: ${stats.Ranking}`,
    },
    Trigger: ["workflow"],
  });

  return stats;
}

// Render chart
function renderChart(type, stats) {
  const ctx = document.getElementById("statsChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: type,
    data: {
      labels: [
        "GitHub Repos",
        "GitHub Stars",
        "GitHub Followers",
        "LeetCode Easy",
        "LeetCode Medium",
        "LeetCode Hard",
      ],
      datasets: [
        {
          label: "Candidate Performance",
          data: [
            stats.githubRepos,
            stats.githubStars,
            stats.githubFollowers,
            stats.leetcodeEasy,
            stats.leetcodeMedium,
            stats.leetcodeHard,
          ],
          backgroundColor: [
            "#3b82f6",
            "#2563eb",
            "#1e40af",
            "#38bdf8",
            "#0ea5e9",
            "#0284c7",
          ],
          borderColor: "#00f0ff",
          borderWidth: 2,
          fill: type === "line",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1000, easing: "easeOutQuart" },
      plugins: {
        legend: { labels: { color: "white", font: { size: 14 } } },
        tooltip: { enabled: true },
      },
      scales:
        type !== "pie"
          ? {
              x: { ticks: { color: "white" }, grid: { color: "#1e3a8a" } },
              y: {
                ticks: { color: "white" },
                grid: { color: "#1e3a8a" },
                beginAtZero: true,
              },
            }
          : {},
    },
  });
}

// Show chart
function showChart(type) {
  document.getElementById("chartWrapper").classList.remove("hidden");
  renderChart(type, statsGlobal);
}
