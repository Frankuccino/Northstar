# Task Card Indicators

The task card in the Kanban board shows metadata in a specific layout with fixed height.

## Layout

```
┌─────────────────────────────────────┐
│ Title text that can wrap to 2 lines │ [High]  ← upper right
├─────────────────────────────────────┤
│ [?]              ···   Jan 15  💬 2 │  ← assignee left, date+comments right
└─────────────────────────────────────┘
```

## Structure

```tsx
<Card className="group/card flex h-28 cursor-pointer flex-col justify-between p-3">
  {/* Title + Priority */}
  <div className="flex items-start justify-between gap-2">
    <p className="line-clamp-2 min-w-0 text-sm font-medium leading-snug">{task.title}</p>
    <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium" style={priorityStyle}>
      {PRIORITY_LABELS[task.priority]}
    </span>
  </div>

  {/* Bottom row: Assignee + Date/Comments */}
  <div className="mt-1.5 flex items-center justify-between text-xs">
    <div className="flex items-center gap-1.5">
      {/* Assignee avatar - ALWAYS shows */}
      {task.assigneeName ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary ring-1 ring-primary/20">
          {initials(task.assigneeName)}
        </span>
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-1 ring-border">
          ?
        </span>
      )}
    </div>
    <div className="flex items-center gap-1.5">
      {formattedDate && <span>{formattedDate}</span>}
      {(task.commentCount ?? 0) > 0 && (
        <span className="flex items-center gap-0.5">
          <MessageSquareIcon /> {task.commentCount}
        </span>
      )}
    </div>
  </div>
</Card>
```

## Key Rules

1. **Fixed height (`h-28`)**: All cards are uniform. Use `flex-col justify-between` to pin content to top/bottom.
2. **`line-clamp-2`**: Long titles wrap to 2 lines then truncate with "..."
3. **`min-w-0` on title**: Required for `line-clamp` to work in flex context
4. **Priority badge**: Upper right, `shrink-0` to prevent compression
5. **Assignee avatar**: Always shows — "?" placeholder for unassigned
6. **Right side order**: Due date → Priority badge (in card detail, not here) → Comment count
7. **Comment count**: Only shows when > 0, with SVG icon
