
from typing import List, Dict, Any

class DeepResearchState:
    """Internal state for deep research iterations"""
    def __init__(self):
        self.research_plan: List[str] = []
        self.current_iteration: int = 0
        self.max_iterations: int = 3
        self.gathered_information: List[Dict[str, Any]] = []
        self.knowledge_gaps: List[str] = []
        self.confidence_score: float = 0.0
        self.sources: List[str] = []
        
       
        self.plan_history: List[Dict[str, Any]] = []  
        self.user_feedback: List[str] = []  
        self.planning_attempts: int = 0  