from graph_type import GraphState
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv
load_dotenv()
api_key=os.getenv("")
import replicate

async def generate_image(state: GraphState)-> GraphState:
    """
    Based on user query Genrtae the image
    """
    user_query=state.get("resolved_query") or state.get("user_query")
    output = replicate.run(
    "black-forest-labs/flux-schnell",
    input={"prompt": user_query}
    )
    print(f"image link", output)
    state["response"]=output
