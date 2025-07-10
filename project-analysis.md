# Advanced MCP Features - Project Analysis

## Project Overview

This is a comprehensive workshop repository focused on **Advanced Model Context Protocol (MCP) Features**. The project is designed as an educational resource by Epic Web (Kent C. Dodds) to teach developers advanced MCP implementation techniques.

## Project Structure

### Core Components

- **Workshop App**: Built with Epic Web's learning platform
- **Language**: TypeScript with Node.js (v22.13.0+)
- **MCP SDK**: Uses the official `@modelcontextprotocol/sdk`
- **Database**: SQLite with schema migrations
- **Testing**: Includes MCP Inspector for testing servers

### Exercise Categories

The repository contains **5 main exercise categories**, each with problem/solution pairs:

#### 1. **Advanced Tools** (`01.advanced-tools/`)
- **Annotations**: Learning to properly annotate MCP tools with metadata
- **Structured**: Working with structured data and complex schemas
- Focus: Tool annotations, destructive operations, read-only vs. open-world tools

#### 2. **Elicitation** (`02.elicitation/`)
- Focus: How to elicit information from users effectively through MCP tools
- Building interactive MCP servers that can gather user input

#### 3. **Sampling** (`03.sampling/`)
- **Simple**: Basic sampling techniques
- **Advanced**: Complex sampling scenarios  
- Focus: Handling different sampling strategies in MCP implementations

#### 4. **Long-Running Tasks** (`04.long-running-tasks/`)
- **Progress**: Implementing progress tracking for long operations
- **Cancellation**: Handling task cancellation and cleanup
- Focus: Async operations, progress reporting, graceful cancellation

#### 5. **Changes** (`05.changes/`)
- **List Changed**: Tracking and reporting changes in data
- **Resources List Changed**: Managing resource change notifications
- **Subscriptions**: Implementing subscription-based change notifications
- Focus: Change detection, real-time updates, subscription management

## Sample Application: EpicMe Journal

The exercises use a consistent sample application called **EpicMe** - a journaling app with the following features:

### Core Functionality
- Create, read, update, delete journal entries
- Tag management system
- Entry-tag relationships
- Video "wrapped" generation (yearly summaries)

### MCP Tools Implemented
- `create_entry`, `get_entry`, `list_entries`, `update_entry`, `delete_entry`
- `create_tag`, `get_tag`, `list_tags`, `update_tag`, `delete_tag`
- `add_tag_to_entry`
- `create_wrapped_video`

### Database Schema
- **Entries**: id, title, content, mood, createdAt, updatedAt
- **Tags**: id, name, createdAt, updatedAt
- **EntryTags**: entryId, tagId (junction table)

## Key Learning Topics

### Technical Concepts
1. **Tool Annotations**: Proper classification of MCP tools (destructive, read-only, idempotent, open-world)
2. **Progress Tracking**: Long-running operations with progress updates
3. **Cancellation Handling**: Graceful cleanup and user cancellation
4. **Change Management**: Real-time change notifications and subscriptions
5. **Resource Management**: Embedded resources vs. resource links
6. **Schema Design**: Complex input validation with Zod

### MCP Features Covered
- Advanced tool capabilities configuration
- Resource management and linking
- Prompt engineering integration
- Server lifecycle management
- Error handling and validation
- Real-time communication patterns

## Development Workflow

### Setup & Running
```bash
npm run setup    # Initial setup
npm start        # Start workshop app
npm run dev:mcp  # Development mode
npm run inspect  # Launch MCP Inspector
```

### Exercise Structure
Each exercise follows a consistent pattern:
- **Problem**: Incomplete implementation with TODO comments
- **Solution**: Complete working implementation
- **Test Infrastructure**: Each exercise can be tested independently
- **README**: Context and learning objectives

## Target Audience

- Developers with JavaScript/TypeScript experience
- Those familiar with Node.js
- Students who have completed MCP Fundamentals
- Builders creating AI-connected applications

## Key Technologies & Dependencies

- **@modelcontextprotocol/sdk**: Official MCP TypeScript SDK
- **@modelcontextprotocol/inspector**: Testing tool for MCP servers
- **SQLite**: Database for persistent storage
- **Zod**: Schema validation
- **Epic Web Infrastructure**: Workshop platform and tooling

## Project Goals

This workshop teaches developers to:
1. Build production-ready MCP servers with advanced features
2. Implement complex tool annotations and metadata
3. Handle long-running operations and progress tracking
4. Manage real-time changes and subscriptions
5. Create robust error handling and validation
6. Test MCP implementations effectively

The project represents a comprehensive deep-dive into MCP beyond basic tool creation, focusing on the advanced features needed for production AI-connected applications.