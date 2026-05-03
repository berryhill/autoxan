# CRITICAL TOOL USAGE RULES FOR PLATFORM TOOLS AGENT

## ⚠️ MANDATORY PARAMETER REQUIREMENTS ⚠️

### write_to_file - REQUIRES TWO PARAMETERS

**YOU MUST ALWAYS PROVIDE BOTH:**
1. `path` - The file path to write to
2. `content` - The COMPLETE file content

**NEVER call write_to_file without the content parameter.**

Correct format:
```xml
<write_to_file>
<path>agent/platform_agent/tools/new_tool.py</path>
<content>
"""New tool module."""

async def new_tool_function(param: str) -> dict:
    """Tool description."""
    return {"status": "success"}
</content>
</write_to_file>
```

WRONG - Missing content parameter:
```xml
<write_to_file>
<path>agent/platform_agent/tools/new_tool.py</path>
</write_to_file>
```

### apply_diff - REQUIRES TWO PARAMETERS

**YOU MUST ALWAYS PROVIDE BOTH:**
1. `path` - The file path to modify
2. `diff` - The search/replace blocks

Correct format:
```xml
<apply_diff>
<path>agent/platform_agent/tools/existing_tool.py</path>
<diff>
<<<<<<< SEARCH
old code
=======
new code
>>>>>>> REPLACE
</diff>
</apply_diff>
```

### execute_command - REQUIRES COMMAND PARAMETER

**YOU MUST ALWAYS PROVIDE:**
1. `command` - The shell command to execute

Correct format:
```xml
<execute_command>
<command>cd agent && pytest platform_agent/tools/tests/ -v</command>
</execute_command>
```

## CHECKLIST BEFORE USING TOOLS

Before calling write_to_file:
- [ ] Do I have the `path` parameter?
- [ ] Do I have the `content` parameter with COMPLETE file content?

Before calling apply_diff:
- [ ] Do I have the `path` parameter?
- [ ] Do I have the `diff` parameter with search/replace blocks?

Before calling execute_command:
- [ ] Do I have the `command` parameter?

## FAILURE TO FOLLOW THESE RULES WILL CAUSE ERRORS
