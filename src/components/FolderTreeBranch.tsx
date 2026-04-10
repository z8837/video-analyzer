import type { FolderTreeNode } from '../types'

type FolderTreeBranchProps = {
  node: FolderTreeNode
  depth: number
  expandedPaths: Set<string>
  selectedPath: string
  onToggle: (folderPath: string) => void
  onSelect: (folderPath: string) => void
}

export function FolderTreeBranch({
  node,
  depth,
  expandedPaths,
  selectedPath,
  onToggle,
  onSelect,
}: FolderTreeBranchProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = node.path === selectedPath
  const label = node.relativePath === '.' ? '기본 폴더' : node.name

  return (
    <div className="tree-branch">
      <button
        className={`tree-row ${isSelected ? 'selected' : ''}`}
        type="button"
        onClick={() => {
          onSelect(node.path)
          if (hasChildren) onToggle(node.path)
        }}
        style={{ paddingLeft: `${12 + depth * 18}px` }}
      >
        <span className="tree-arrow">{hasChildren ? (isExpanded ? '▾' : '▸') : ''}</span>
        <span className="tree-icon">📁</span>
        <span className="tree-name">{label}</span>
        <span className="tree-count">{node.totalVideoCount}</span>
      </button>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map((child) => (
            <FolderTreeBranch
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
