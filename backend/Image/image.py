from graph_type import GraphState
from typing import Dict
import os
from dotenv import load_dotenv
import replicate

load_dotenv()
api_token = os.getenv("REPLICATE_API_TOKEN")
print("Token loaded:", bool(api_token))

def generate_image(state: GraphState) -> GraphState:
    """
    Generate an image from user query using Replicate (Flux Schnell model).
    """
    user_query = state.get("resolved_query") or state.get("user_query")

    try:
        output = replicate.run(
            "black-forest-labs/flux-schnell",
            input={"prompt": user_query}
        )
        image_url = None
        if isinstance(output, list):

            first = output[0]
            if hasattr(first, "url"):
                image_url = first.url
            else:
                image_url = str(first)
        elif hasattr(output, "url"):
            image_url = output.url
        else:
            image_url = str(output)

        print("✅ Generated image URL:", image_url)
        state["response"] = image_url

    except Exception as e:
        print("❌ Error during image generation:", e)
        state["response"] = f"Image generation failed: {str(e)}"

    return state
