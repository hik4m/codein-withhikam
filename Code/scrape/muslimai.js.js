import axios from "axios"

const ENDPOINT = "https://vercel-server-psi-ten.vercel.app/chat"

async function muslimai(promptEN) {
  if (!promptEN || typeof promptEN !== "string") {
    throw new Error("INVALID_PROMPT")
  }

  try {
    const { data } = await axios.post(
      ENDPOINT,
      {
        text: promptEN,
        array: [
          {
            role: "user",
            content: "What is Islam? Tell with reference to a Quran Ayat and Hadith"
          },
          {
            role: "assistant",
            content:
              "\"Islam\" is an Arabic word that means \"submission\" or \"surrender\" to the will of Allah (SWT)."
          }
        ]
      },
      {
        timeout: 30000,
        headers: {
          "content-type": "application/json"
        }
      }
    )

    if (!data?.result) {
      throw new Error("NO_RESULT")
    }

    return {
      status: true,
      result: data.result.trim()
    }
  } catch (e) {
    return {
      status: false,
      error: e.message
    }
  }
}

export default muslimai