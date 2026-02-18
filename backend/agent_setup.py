"""Agent initialization module - extracted from chatbot.py."""

import json
import os
import time

os.environ["OPENAI_AGENTS_DISABLE_TRACING"] = "1"

from agents.agent import Agent
from coinbase_agentkit import (
    AgentKit,
    AgentKitConfig,
    CdpEvmWalletProvider,
    CdpEvmWalletProviderConfig,
    cdp_api_action_provider,
    erc20_action_provider,
    pyth_action_provider,
    wallet_action_provider,
    weth_action_provider,
)
from coinbase_agentkit_openai_agents_sdk import get_openai_agents_sdk_tools

AGENT_INSTRUCTIONS = (
    "You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. "
    "You are empowered to interact onchain using your tools. If you ever need funds, you can request "
    "them from the faucet if you are on network ID 'base-sepolia'. If not, you can provide your wallet "
    "details and request funds from the user. Before executing your first action, get the wallet details "
    "to see what network you're on. If there is a 5XX (internal) HTTP error code, ask the user to try "
    "again later. If someone asks you to do something you can't do with your currently available tools, "
    "you must say so, and encourage them to implement it themselves using the CDP SDK + Agentkit, "
    "recommend they go to docs.cdp.coinbase.com for more information. Be concise and helpful with your "
    "responses. Refrain from restating your tools' descriptions unless it is explicitly requested. "
    "AgentKit is a toolkit for building agents with access to a crypto wallet and set of onchain interactions. "
    "Coinbase believes that every AI agent deserves a crypto wallet so they have the ability to pay anyone in "
    "the world using fast & free rails, interact with the decentralized finance ecosystem, and push the "
    "boundaries of what AI agents can do and how they can interact autonomously. If a user asks you a question "
    "about the networks and how to change it, let them know that they can change it by changing the environment "
    "variable and also changing the name of the `wallet_data.txt` file."
)

# Module-level state
_agent: Agent | None = None
_wallet_provider: CdpEvmWalletProvider | None = None
_agentkit: AgentKit | None = None


def initialize_agent(config: CdpEvmWalletProviderConfig) -> tuple[Agent, CdpEvmWalletProvider, AgentKit]:
    """Initialize the agent with CDP Agentkit."""
    wallet_provider = CdpEvmWalletProvider(config)

    agentkit = AgentKit(
        AgentKitConfig(
            wallet_provider=wallet_provider,
            action_providers=[
                cdp_api_action_provider(),
                erc20_action_provider(),
                pyth_action_provider(),
                wallet_action_provider(),
                weth_action_provider(),
            ],
        )
    )

    tools = get_openai_agents_sdk_tools(agentkit)

    agent = Agent(
        name="CDP Agent",
        instructions=AGENT_INSTRUCTIONS,
        model="gpt-4o-mini",
        tools=tools,
    )

    return agent, wallet_provider, agentkit


def setup() -> Agent:
    """Set up the agent with persistent wallet storage."""
    global _agent, _wallet_provider, _agentkit

    network_id = os.getenv("NETWORK_ID", "base-sepolia")
    # Use absolute path relative to this file so it works regardless of cwd
    _dir = os.path.dirname(os.path.abspath(__file__))
    wallet_file = os.path.join(_dir, f"wallet_data_{network_id.replace('-', '_')}.txt")

    wallet_data = {}
    if os.path.exists(wallet_file):
        try:
            with open(wallet_file) as f:
                wallet_data = json.load(f)
                print(f"Loading existing wallet from {wallet_file}")
        except json.JSONDecodeError:
            print(f"Warning: Invalid wallet data for {network_id}")
            wallet_data = {}

    wallet_address = (
        wallet_data.get("address")
        or os.getenv("ADDRESS")
        or None
    )

    api_key_id = os.getenv("CDP_API_KEY_ID", "").strip().strip('"').strip("'")
    api_key_secret = os.getenv("CDP_API_KEY_SECRET", "").strip().strip('"').strip("'")

    if not api_key_id or not api_key_secret:
        raise ValueError(
            "CDP_API_KEY_ID and CDP_API_KEY_SECRET must be set. "
            "Get them from: https://portal.cdp.coinbase.com/access/api"
        )

    api_key_secret = api_key_secret.replace("\\n", "\n")
    wallet_secret = os.getenv("CDP_WALLET_SECRET", "").strip().strip('"').strip("'") or None

    config = CdpEvmWalletProviderConfig(
        api_key_id=api_key_id,
        api_key_secret=api_key_secret,
        wallet_secret=wallet_secret,
        network_id=network_id,
        address=wallet_address,
        idempotency_key=(os.getenv("IDEMPOTENCY_KEY") if not wallet_address else None),
    )

    agent, wallet_provider, agentkit = initialize_agent(config)

    new_wallet_data = {
        "address": wallet_provider.get_address(),
        "network_id": network_id,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        if not wallet_data
        else wallet_data.get("created_at"),
    }

    with open(wallet_file, "w") as f:
        json.dump(new_wallet_data, f, indent=2)
        print(f"Wallet data saved to {wallet_file}")

    _agent = agent
    _wallet_provider = wallet_provider
    _agentkit = agentkit

    return agent


def get_agent() -> Agent:
    """Get the initialized agent, setting up if needed."""
    global _agent
    if _agent is None:
        setup()
    return _agent


def get_wallet_provider() -> CdpEvmWalletProvider | None:
    """Get the wallet provider."""
    return _wallet_provider


def get_wallet_info() -> dict:
    """Get current wallet information."""
    if _wallet_provider is None:
        return {"status": "not_initialized"}

    network_id = os.getenv("NETWORK_ID", "base-sepolia")
    return {
        "address": _wallet_provider.get_address(),
        "network_id": network_id,
        "status": "connected",
    }


def get_available_tools() -> list[dict]:
    """Get list of available agent tools with their descriptions."""
    if _agent is None:
        return []

    tools_info = []
    for tool in _agent.tools:
        tool_info = {"name": getattr(tool, "name", str(tool))}
        if hasattr(tool, "description"):
            tool_info["description"] = tool.description
        tools_info.append(tool_info)
    return tools_info
