import { ToolResult, EditorCommand } from "../types/index.js";
export declare class TextEditorTool {
    private editHistory;
    private confirmationService;
    view(filePath: string, viewRange?: [number, number]): Promise<ToolResult>;
    strReplace(filePath: string, oldStr: string, newStr: string, replaceAll?: boolean): Promise<ToolResult>;
    create(filePath: string, content: string): Promise<ToolResult>;
    replaceLines(filePath: string, startLine: number, endLine: number, newContent: string): Promise<ToolResult>;
    insert(filePath: string, insertLine: number, content: string): Promise<ToolResult>;
    undoEdit(): Promise<ToolResult>;
    private findFuzzyMatch;
    private normalizeForComparison;
    private isSimilarStructure;
    /**
     * Compute Longest Common Subsequence using dynamic programming
     * Returns array of indices in oldLines that are part of LCS
     */
    private computeLCS;
    /**
     * Extract changes from LCS table
     * Returns array of change regions
     */
    private extractChanges;
    private generateDiff;
    getEditHistory(): EditorCommand[];
}
