# streamlit_mcp_demo.py
import streamlit as st
import requests

BACKEND = "http://localhost:8000"

st.set_page_config(page_title="MCP + Composio Demo", layout="centered")

# Handle OAuth callback
query_params = st.query_params
if "status" in query_params:
    if query_params["status"] == "success":
        st.success(f"✅ Successfully connected! Connection ID: {query_params.get('connection_id', 'N/A')}")
        if st.button("Continue"):
            st.query_params.clear()
            st.rerun()
    elif query_params["status"] == "error":
        st.error(f"❌ Connection failed: {query_params.get('message', 'Unknown error')}")
        if st.button("Try Again"):
            st.query_params.clear()
            st.rerun()

st.title("🔬 MCP + Composio Demo (Gmail + GitHub)")

# -----------------------------
# User input
# -----------------------------
user_id = st.text_input("Enter a User ID", value="user_demo")

if not user_id:
    st.stop()

# -----------------------------
# Connection Status Section
# -----------------------------
st.divider()
st.subheader("📊 Connection Status")

try:
    resp = requests.get(f"{BACKEND}/api/mcp/connections", params={"user_id": user_id}, timeout=5)
    if resp.status_code == 200:
        connections_data = resp.json()
        connections = connections_data.get("connections", [])
        
        if connections:
            st.success(f"✅ {len(connections)} active connection(s)")
            for conn in connections:
                col1, col2, col3 = st.columns([3, 2, 2])
                with col1:
                    st.write(f"**{conn['app']}**")
                with col2:
                    status_color = "🟢" if conn['status'] == "ACTIVE" else "🟡"
                    st.write(f"{status_color} {conn['status']}")
                with col3:
                    st.caption(f"ID: {conn['id'][:12]}...")
        else:
            st.info("No active connections yet. Connect apps below.")
    else:
        st.warning("Could not fetch connection status")
except requests.exceptions.RequestException as e:
    st.error(f"⚠️ Cannot reach backend: {str(e)}")
    st.info("Make sure backend is running: `python mcp_demo.py`")
    st.stop()

# -----------------------------
# Enable MCP toggle
# -----------------------------
st.divider()
enable_mcp = st.checkbox("Enable MCP Tools", value=True)

if enable_mcp:
    st.subheader("Available Tools (Gmail + GitHub)")
    
    try:
        # Changed from /api/mcp/tools to /api/mcp/apps
        resp = requests.get(f"{BACKEND}/api/mcp/apps", timeout=5)
        apps = resp.json().get("apps", [])
    except Exception as e:
        st.error(f"Cannot reach backend: {e}")
        st.stop()

    if not apps:
        st.warning("No apps configured. Check your Auth Config IDs in .env file.")
    
    for app in apps:
        name = app.get("name")
        slug = app.get("slug")
        logo = app.get("logo", "https://logos.composio.dev/api/default")
        description = app.get("description", "")
        
        col1, col2 = st.columns([4, 1])
        with col1:
            st.image(logo, width=30)
            st.write(f"**{name}** ({slug})")
            if description:
                st.caption(description)
        with col2:
            if st.button("Connect", key=f"connect_{slug}"):
                with st.spinner(f"Connecting {name}..."):
                    try:
                        res = requests.post(
                            f"{BACKEND}/api/mcp/connect",
                            json={
                                "user_id": user_id,
                                "app": slug,  # Changed from "toolkit" to "app"
                                "redirect_url": "http://localhost:8501"
                            },
                            timeout=10
                        )
                        
                        if res.status_code == 200:
                            data = res.json()
                            st.success(f"✅ Authorization link generated!")
                            st.markdown(
                                f"[🔗 Authorize {name}]({data['redirect_url']})",
                                unsafe_allow_html=True,
                            )
                            st.info("Click the link above, authorize, and you'll be redirected back.")
                        else:
                            error_detail = res.json().get('detail', 'Connection failed')
                            st.error(f"❌ Error: {error_detail}")
                    except Exception as e:
                        st.error(f"Connection error: {str(e)}")
        
        st.divider()
else:
    st.info("Toggle MCP to display Gmail + GitHub connect options.")

# Footer
st.caption("💡 **Tip:** After connecting, check the Connection Status section above")