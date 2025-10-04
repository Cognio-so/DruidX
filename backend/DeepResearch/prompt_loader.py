 
import os

def load_prompts():
    """Load prompts from deepresearch.md file"""
    prompt_path = os.path.join(os.path.dirname(__file__), "deepresearch.md")
    try:
        with open(prompt_path, 'r', encoding='utf-8') as f:
            prompt_content = f.read()
            
            sections = {}
            current_section = None
            current_content = []
            
            for line in prompt_content.split('\n'):
                if line.startswith('# ') and not line.startswith('## '):
                    if current_section and current_content:
                        sections[current_section] = '\n'.join(current_content).strip()
                    current_section = line[2:].strip()
                    current_content = []
                else:
                    current_content.append(line)
            
            if current_section and current_content:
                sections[current_section] = '\n'.join(current_content).strip()
            system_prompt = sections.get('Deep Research System Prompt', '')
            planning_prompt_template = sections.get('Research Planning Prompt', '')
            gap_analysis_prompt_template = sections.get('Gap Analysis Prompt', '')
            synthesis_prompt_template = sections.get('Synthesis Prompt', '')
            
            return {
                'system_prompt': system_prompt,
                'planning_prompt_template': planning_prompt_template,
                'gap_analysis_prompt_template': gap_analysis_prompt_template,
                'synthesis_prompt_template': synthesis_prompt_template
            }
            
    except FileNotFoundError:
        print("[DeepResearch] Warning: deepresearch.md not found, using fallback prompts")
        return {
            'system_prompt': "You are a deep research assistant.",
            'planning_prompt_template': "Break down this query into sub-questions: {query}",
            'gap_analysis_prompt_template': "Analyze gaps in research for: {query}",
            'synthesis_prompt_template': "Synthesize findings for: {query}"
        }
PROMPTS = load_prompts()