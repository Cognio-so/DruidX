

import asyncio
import aiohttp
from typing import List, Dict, Any, Optional, Set
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import re
from graph_type import GraphState
from WebSearch.websearch import web_search
from llm import get_reasoning_llm, get_llm


class WebPageExtractor:
    """Extract clean, readable content from web pages"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        self.visited_urls: Set[str] = set()
        
    async def extract_content(self, url: str, timeout: int = 15) -> Optional[Dict[str, Any]]:
        """
        Extract main content from a web page
        Returns: dict with title, content, links, metadata
        """
        if url in self.visited_urls:
            return None
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.headers, timeout=timeout, allow_redirects=True) as response:
                    if response.status != 200:
                        print(f"[Extractor] HTTP {response.status} for {url}")
                        return None
                    
                    content_type = response.headers.get('Content-Type', '').lower()
                    if 'text/html' not in content_type:
                        print(f"[Extractor] Skipping non-HTML: {content_type}")
                        return None
                    
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    for element in soup(['script', 'style', 'nav', 'footer', 'header', 
                                        'aside', 'iframe', 'noscript', 'button']):
                        element.decompose()
                    
                    title = self._extract_title(soup)
                    content = self._extract_main_content(soup)
                    links = self._extract_links(soup, url)
                    metadata = self._extract_metadata(soup)
                    
                    self.visited_urls.add(url)
                    
                    return {
                        'url': url,
                        'title': title,
                        'content': content,
                        'content_length': len(content),
                        'links': links,
                        'metadata': metadata,
                        'success': True
                    }
                    
        except asyncio.TimeoutError:
            print(f"[Extractor] Timeout for {url}")
        except Exception as e:
            print(f"[Extractor] Error extracting {url}: {type(e).__name__}")
        
        return None
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page title"""
        if soup.title and soup.title.string:
            return soup.title.string.strip()
        og_title = soup.find('meta', property='og:title')
        if og_title and og_title.get('content'):
            return og_title.get('content').strip()
        h1 = soup.find('h1')
        if h1:
            return h1.get_text().strip()
        
        return "Untitled"
    
    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """
        Extract main readable content using multiple strategies
        """
        article = soup.find('article')
        if article:
            text = self._clean_text(article.get_text())
            if len(text) > 300:
                return text
        main = soup.find('main')
        if main:
            text = self._clean_text(main.get_text())
            if len(text) > 300:
                return text
        role_main = soup.find(attrs={'role': 'main'})
        if role_main:
            text = self._clean_text(role_main.get_text())
            if len(text) > 300:
                return text
        for pattern in [
            {'id': re.compile(r'content|main|article|post|body', re.I)},
            {'class': re.compile(r'content|main|article|post|body|entry', re.I)}
        ]:
            content_div = soup.find('div', pattern)
            if content_div:
                text = self._clean_text(content_div.get_text())
                if len(text) > 300:
                    return text
    
        paragraphs = soup.find_all('p')
        if paragraphs:
            text = ' '.join([p.get_text() for p in paragraphs])
            return self._clean_text(text)
        return self._clean_text(soup.get_text())
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = text.strip()
        return text
    
    def _extract_links(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Extract links with anchor text"""
        links = []
        seen_urls = set()
        
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            anchor_text = a_tag.get_text().strip()
            
            if not anchor_text or len(anchor_text) < 3:
                continue
            try:
                full_url = urljoin(base_url, href)
            except:
                continue
            if (not full_url.startswith('http') or 
                '#' in full_url.split('/')[-1] or
                full_url in seen_urls):
                continue
            
            seen_urls.add(full_url)
            
            links.append({
                'url': full_url,
                'anchor_text': anchor_text[:150],
                'domain': urlparse(full_url).netloc
            })
            
            if len(links) >= 30:  
                break
        
        return links
    
    def _extract_metadata(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract page metadata"""
        metadata = {}
        desc = soup.find('meta', attrs={'name': 'description'})
        if desc and desc.get('content'):
            metadata['description'] = desc.get('content')
        author = soup.find('meta', attrs={'name': 'author'})
        if author and author.get('content'):
            metadata['author'] = author.get('content')
        date_meta = soup.find('meta', property='article:published_time')
        if date_meta and date_meta.get('content'):
            metadata['published'] = date_meta.get('content')
        
        return metadata

async def select_relevant_links(
    links: List[Dict[str, str]], 
    query: str,
    llm,
    max_links: int = 2
) -> List[str]:
    """
    Use LLM to intelligently select which links to follow
    
    Args:
        links: List of {url, anchor_text, domain}
        query: Research query
        llm: Language model instance
        max_links: Max number of links to return
    
    Returns:
        List of selected URLs
    """
    from langchain_core.messages import HumanMessage
    
    if not links or max_links <= 0:
        return []

    filtered_links = [
        link for link in links 
        if not any(skip in link['anchor_text'].lower() for skip in [
            'home', 'login', 'signup', 'register', 'subscribe', 
            'privacy', 'terms', 'contact', 'about us', 'cookie'
        ])
    ][:15] 
    
    if not filtered_links:
        return []

    links_text = "\n".join([
        f"{i+1}. {link['anchor_text'][:60]} - {link['domain']}"
        for i, link in enumerate(filtered_links)
    ])
    
    prompt = f"""Research query: "{query}"

Available links from the current page:
{links_text}

Select the {max_links} most promising links that would provide DEEPER, more detailed information about the query.

Prioritize:
- Links to full articles, research papers, detailed guides
- Authoritative sources (gov, edu, major publications)
- Content directly related to the query

Avoid:
- General navigation (home, about, etc.)
- Duplicate or redundant topics
- Tangentially related content

Respond with ONLY the numbers (comma-separated, e.g., "3,7"):"""

    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        indices = []
        for part in content.split(','):
            try:
                idx = int(part.strip()) - 1
                if 0 <= idx < len(filtered_links):
                    indices.append(idx)
            except:
                continue
        
        selected_urls = [filtered_links[i]['url'] for i in indices[:max_links]]
        return selected_urls
        
    except Exception as e:
        print(f"[LinkSelector] Error: {e}")
      
        return [link['url'] for link in filtered_links[:max_links]]

async def execute_research_node(state: GraphState) -> GraphState:
    """
    Enhanced research execution with streaming output:
    1. Web search for initial results
    2. Full content extraction from top pages
    3. Intelligent link following for deeper information
    4. Multi-level content aggregation
    5. Stream all progress to user
    """
    research_state_dict = state["deep_research_state"]
    current_iteration = research_state_dict["current_iteration"]
    max_iterations = research_state_dict["max_iterations"]
    
    chunk_callback = state.get("_chunk_callback")

    execution_intro = f"## 🔬 Research Execution Phase - Iteration {current_iteration + 1}/{max_iterations}\n\n"
    if chunk_callback:
        await chunk_callback(execution_intro)
    
    print(f"\n[DeepResearch] === Iteration {current_iteration + 1}/{max_iterations} ===")
   
    if current_iteration == 0:
        queries_to_research = research_state_dict["research_plan"]
        iteration_type = "Initial Research Plan"
    else:
        queries_to_research = research_state_dict["knowledge_gaps"]
        iteration_type = "Knowledge Gap Analysis"
        print(f"[DeepResearch] Knowledge gaps to explore: {len(queries_to_research)}")
    
    if not queries_to_research:
        no_queries_msg = "\n\n✅ **No more queries to research. Moving to synthesis phase...**\n\n"
        if chunk_callback:
            await chunk_callback(no_queries_msg)
        print("[DeepResearch] No queries to research, moving to synthesis")
        state["route"] = "synthesize_report"
        return state
    iteration_info = f"**{iteration_type}:** Processing {len(queries_to_research)} research questions...\n\n"
    if chunk_callback:
        await chunk_callback(iteration_info)

    extractor = WebPageExtractor()
    llm_model=state.get("deep_research_llm_model")
    llm=get_reasoning_llm(llm_model)
    # llm = get_reasoning_llm()
    
    findings = []
    full_response = execution_intro + iteration_info

    for query_idx, query in enumerate(queries_to_research[:6], 1): 
        query_header = f"### 🔍 Research Question {query_idx}/{min(6, len(queries_to_research))}\n**Query:** {query}\n\n"
        if chunk_callback:
            await chunk_callback(query_header)
        full_response += query_header
        
        print(f"\n[DeepResearch] [{query_idx}/{min(6, len(queries_to_research))}] Researching: {query}")
        
        try:
            search_msg = "🌐 **Phase 1: Web Search**\nSearching for relevant information...\n\n"
            if chunk_callback:
                await chunk_callback(search_msg)
            full_response += search_msg
            
            print(f"[DeepResearch] → Phase 1: Web search...")
            search_results = await web_search(query, max_results=5, search_depth="advanced")
            
            if not search_results:
                no_results_msg = "❌ **No search results found for this query.**\n\n"
                if chunk_callback:
                    await chunk_callback(no_results_msg)
                full_response += no_results_msg
                print(f"[DeepResearch] ✗ No search results found")
                continue
    
            search_summary = f"✅ **Found {len(search_results)} search results**\n"
            if chunk_callback:
                await chunk_callback(search_summary)
            full_response += search_summary
        
            search_urls = [
                doc.metadata.get('url') 
                for doc in search_results 
                if doc.metadata.get('url')
            ][:3]
            
            urls_msg = f"📄 **Processing {len(search_urls)} URLs:**\n"
            for i, url in enumerate(search_urls, 1):
                urls_msg += f"{i}. {url}\n"
            urls_msg += "\n"
            if chunk_callback:
                await chunk_callback(urls_msg)
            full_response += urls_msg
            
            print(f"[DeepResearch] Found {len(search_urls)} URLs to extract")
            extraction_msg = f"📖 **Phase 2: Content Extraction**\nExtracting content from web pages...\n\n"
            if chunk_callback:
                await chunk_callback(extraction_msg)
            full_response += extraction_msg
            
            print(f"[DeepResearch] → Phase 2: Extracting content from {len(search_urls)} pages...")
            
            extraction_tasks = [
                extractor.extract_content(url) 
                for url in search_urls
            ]
            extracted_pages = await asyncio.gather(*extraction_tasks)
        
            primary_content = []
            all_links = []

            extraction_results = "**Primary Sources Extracted:**\n"
            for page_data in extracted_pages:
                if page_data and page_data['success']:
                    primary_content.append({
                        'url': page_data['url'],
                        'title': page_data['title'],
                        'content': page_data['content'][:3000],  
                        'content_length': page_data['content_length'],
                        'metadata': page_data.get('metadata', {}),
                        'depth': 1
                    })
                    all_links.extend(page_data['links'])
                    
                    source_info = f"✅ **{page_data['title'][:60]}...**\n"
                    source_info += f"   📊 Content: {page_data['content_length']} characters\n"
                    source_info += f"   🔗 URL: {page_data['url']}\n\n"
                    if chunk_callback:
                        await chunk_callback(source_info)
                    full_response += source_info
                    
                    print(f"[DeepResearch]   ✓ {page_data['title'][:50]}... ({page_data['content_length']} chars)")
            
            secondary_content = []
            if current_iteration == 0 and all_links and len(primary_content) > 0:
                link_analysis_msg = f"🔗 **Phase 3: Link Analysis**\nAnalyzing {len(all_links)} links for deeper information...\n\n"
                if chunk_callback:
                    await chunk_callback(link_analysis_msg)
                full_response += link_analysis_msg
                
                print(f"[DeepResearch] → Phase 3: Analyzing {len(all_links)} links for relevance...")
                
                relevant_urls = await select_relevant_links(
                    all_links, 
                    query, 
                    llm,
                    max_links=2  
                )
                
                if relevant_urls:
                    follow_msg = f"🎯 **Following {len(relevant_urls)} relevant links for deeper research:**\n"
                    for i, url in enumerate(relevant_urls, 1):
                        follow_msg += f"{i}. {url}\n"
                    follow_msg += "\n"
                    if chunk_callback:
                        await chunk_callback(follow_msg)
                    full_response += follow_msg
                    
                    print(f"[DeepResearch] → Following {len(relevant_urls)} relevant links...")
                    
                    follow_tasks = [
                        extractor.extract_content(url) 
                        for url in relevant_urls
                    ]
                    followed_pages = await asyncio.gather(*follow_tasks)
                    secondary_results = "**Secondary Sources (Followed Links):**\n"
                    for page_data in followed_pages:
                        if page_data and page_data['success']:
                            secondary_content.append({
                                'url': page_data['url'],
                                'title': page_data['title'],
                                'content': page_data['content'][:2000],  
                                'content_length': page_data['content_length'],
                                'metadata': page_data.get('metadata', {}),
                                'depth': 2
                            })
                            secondary_info = f"✅ **{page_data['title'][:60]}...**\n"
                            secondary_info += f"   📊 Content: {page_data['content_length']} characters\n"
                            secondary_info += f"   🔗 URL: {page_data['url']}\n\n"
                            if chunk_callback:
                                await chunk_callback(secondary_info)
                            full_response += secondary_info
                            
                            print(f"[DeepResearch]   → Followed: {page_data['title'][:50]}...")
                else:
                    no_relevant_msg = "ℹ️ **No additional relevant links found to follow.**\n\n"
                    if chunk_callback:
                        await chunk_callback(no_relevant_msg)
                    full_response += no_relevant_msg
            if primary_content or secondary_content:
                total_sources = len(primary_content) + len(secondary_content)
                
                finding = {
                    'query': query,
                    'source': 'enhanced_web',
                    'iteration': current_iteration,
                    'primary_sources': primary_content,
                    'secondary_sources': secondary_content,
                    'total_sources': total_sources,
                    'content': create_structured_content(primary_content, secondary_content),
                    'urls': [p['url'] for p in primary_content] + [s['url'] for s in secondary_content]
                }
                
                findings.append(finding)
                completion_summary = f"🎉 **Query Complete!**\n"
                completion_summary += f"📚 **Total Sources:** {total_sources} (Primary: {len(primary_content)}, Secondary: {len(secondary_content)})\n"
                completion_summary += f"🔗 **URLs Gathered:** {len(finding['urls'])}\n\n"
                completion_summary += "---\n\n"
                if chunk_callback:
                    await chunk_callback(completion_summary)
                full_response += completion_summary
                
                print(f"[DeepResearch] ✓ Gathered {total_sources} sources (L1: {len(primary_content)}, L2: {len(secondary_content)})")
            else:
                no_content_msg = "❌ **No content could be extracted from this query.**\n\n---\n\n"
                if chunk_callback:
                    await chunk_callback(no_content_msg)
                full_response += no_content_msg

            if query_idx < len(queries_to_research):
                await asyncio.sleep(1.5)
                
        except Exception as e:
            error_msg = f"❌ **Error researching query:** {str(e)}\n\n---\n\n"
            if chunk_callback:
                await chunk_callback(error_msg)
            full_response += error_msg
            print(f"[DeepResearch] Error researching '{query}': {e}")
            import traceback
            traceback.print_exc()
            continue
    if findings:
        research_state_dict["gathered_information"].extend(findings)
        
        iteration_complete = f"## ✅ Iteration {current_iteration + 1} Complete\n\n"
        iteration_complete += f"📊 **Findings Summary:**\n"
        iteration_complete += f"- **Queries Processed:** {len(findings)}\n"
        iteration_complete += f"- **Total Sources:** {sum(f['total_sources'] for f in findings)}\n"
        iteration_complete += f"- **URLs Collected:** {sum(len(f['urls']) for f in findings)}\n\n"
        
        if research_state_dict["current_iteration"] + 1 < max_iterations:
            iteration_complete += f"🔄 **Next:** Moving to gap analysis for iteration {current_iteration + 2}...\n\n"
        else:
            iteration_complete += f"🎯 **Next:** Moving to final synthesis...\n\n"
            
        if chunk_callback:
            await chunk_callback(iteration_complete)
        full_response += iteration_complete
        
        print(f"\n[DeepResearch] === Iteration Complete: Added {len(findings)} findings ===")
        
        for finding in findings:
            if 'urls' in finding:
                research_state_dict["sources"].extend(finding['urls'])
    else:
        no_findings_msg = f"## ⚠️ Iteration {current_iteration + 1} Complete\n\n"
        no_findings_msg += f"❌ **No findings gathered in this iteration.**\n\n"
        if chunk_callback:
            await chunk_callback(no_findings_msg)
        full_response += no_findings_msg
        
        print(f"\n[DeepResearch] === Iteration Complete: No findings gathered ===")
    state["response"] = ""
    
    research_state_dict["current_iteration"] += 1
    state["deep_research_state"] = research_state_dict
    if research_state_dict["current_iteration"] < max_iterations:
        state["route"] = "analyze_gaps"
    else:
        state["route"] = "synthesize_report"
    
    return state


def create_structured_content(
    primary: List[Dict], 
    secondary: List[Dict]
) -> str:
    """
    Create structured content summary from multi-level sources
    
    Args:
        primary: List of primary source content (from search results)
        secondary: List of secondary source content (from followed links)
    
    Returns:
        Formatted content string
    """
    content_parts = []

    if primary:
        content_parts.append("=== PRIMARY SOURCES (Search Results) ===\n")
        for i, source in enumerate(primary, 1):
            content_parts.append(
                f"**[L1-{i}] {source['title']}**\n"
                f"URL: {source['url']}\n"
                f"Content Length: {source['content_length']} chars\n"
                f"{source['content']}\n"
            )
    if secondary:
        content_parts.append("\n=== SECONDARY SOURCES (Followed Links) ===\n")
        for i, source in enumerate(secondary, 1):
            content_parts.append(
                f"**[L2-{i}] {source['title']}**\n"
                f"URL: {source['url']}\n"
                f"Content Length: {source['content_length']} chars\n"
                f"{source['content']}\n"
            )
    
    return "\n".join(content_parts)

async def execute_research_node_simple(state: GraphState) -> GraphState:
    """
    Simple version without enhanced browsing (original implementation)
    """
    research_state_dict = state["deep_research_state"]
    current_iteration = research_state_dict["current_iteration"]
    max_iterations = research_state_dict["max_iterations"]
    
    print(f"\n[DeepResearch] === Iteration {current_iteration + 1}/{max_iterations} (Simple Mode) ===")
    
    if current_iteration == 0:
        queries_to_research = research_state_dict["research_plan"]
    else:
        queries_to_research = research_state_dict["knowledge_gaps"]
    
    if not queries_to_research:
        state["route"] = "synthesize_report"
        return state
    
    findings = []
    for query in queries_to_research:
        print(f"[DeepResearch] Researching: {query}")
        try:
            web_results = await web_search(query, max_results=5, search_depth="advanced")
            if web_results:
                findings.append({
                    "query": query,
                    "source": "web",
                    "content": "\n".join([
                        f"{doc.metadata.get('title', 'Unknown')}: {doc.page_content[:300]}"
                        for doc in web_results
                    ]),
                    "urls": [doc.metadata.get('url', '') for doc in web_results],
                    "iteration": current_iteration
                })
        except Exception as e:
            print(f"[DeepResearch] Web search error: {e}")

    research_state_dict["gathered_information"].extend(findings)
    research_state_dict["current_iteration"] += 1
    
    for finding in findings:
        if 'urls' in finding:
            research_state_dict["sources"].extend(finding['urls'])
    
    state["deep_research_state"] = research_state_dict
    
    if research_state_dict["current_iteration"] < max_iterations:
        state["route"] = "analyze_gaps"
    else:
        state["route"] = "synthesize_report"
    
    return state