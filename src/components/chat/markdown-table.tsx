import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface MarkdownTableProps {
  content: string;
  isMe?: boolean;
  isDark?: boolean;
}

export function isMarkdownTable(text: string): boolean {
  if (!text) return false;
  const lines = text.trim().split('\n');
  return (
    lines.length >= 2 &&
    lines.some(line => line.includes('|'))
  );
}

export function MarkdownTable({ content, isMe = false, isDark = false }: MarkdownTableProps) {
  const lines = content.trim().split('\n').filter(l => l.trim().length > 0);
  
  const rawRows: string[][] = [];

  lines.forEach(line => {
    // Ignore separator line like | --- | --- | or |---|---|
    if (/^\s*\|?\s*[:\-\s|]+\s*\|?\s*$/.test(line)) return;

    let trimmed = line.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);

    const cells = trimmed.split('|').map(c => c.trim());
    if (cells.length > 0) {
      rawRows.push(cells);
    }
  });

  if (rawRows.length === 0) {
    return <Text style={{ color: isMe ? '#fff' : isDark ? '#fff' : '#000' }}>{content}</Text>;
  }

  const headerRow = rawRows[0];
  const bodyRows = rawRows.slice(1);
  const columnCount = headerRow.length;

  // Calculate width for each column based on content length
  const colWidths: number[] = new Array(columnCount).fill(90);

  rawRows.forEach(row => {
    row.forEach((cell, idx) => {
      if (idx < columnCount) {
        const estimatedWidth = Math.min(220, Math.max(90, cell.length * 8.5 + 24));
        if (estimatedWidth > colWidths[idx]) {
          colWidths[idx] = estimatedWidth;
        }
      }
    });
  });

  const borderColor = isMe ? 'rgba(255,255,255,0.25)' : isDark ? '#3f3f46' : '#cbd5e1';
  const headerBg = isMe ? 'rgba(0,0,0,0.18)' : isDark ? '#27272a' : '#f1f5f9';
  const textHeaderColor = isMe ? '#ffffff' : isDark ? '#34d399' : '#059669';
  const textCellColor = isMe ? '#ffffff' : isDark ? '#f4f4f5' : '#0f172a';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.scroll}>
      <View style={[styles.tableContainer, { borderColor }]}>
        {/* Table Header */}
        <View style={[styles.row, styles.headerRow, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
          {headerRow.map((colText, idx) => (
            <View
              key={idx}
              style={[
                styles.cell,
                { width: colWidths[idx] || 90 },
                idx < columnCount - 1 && { borderRightWidth: 1, borderRightColor: borderColor },
              ]}>
              <Text style={[styles.headerText, { color: textHeaderColor }]} numberOfLines={2}>
                {colText}
              </Text>
            </View>
          ))}
        </View>

        {/* Table Body Rows */}
        {bodyRows.map((row, rIdx) => (
          <View
            key={rIdx}
            style={[
              styles.row,
              rIdx < bodyRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderColor },
            ]}>
            {Array.from({ length: columnCount }).map((_, cIdx) => {
              const cellText = row[cIdx] || '';
              return (
                <View
                  key={cIdx}
                  style={[
                    styles.cell,
                    { width: colWidths[cIdx] || 90 },
                    cIdx < columnCount - 1 && { borderRightWidth: 1, borderRightColor: borderColor },
                  ]}>
                  <Text style={[styles.cellText, { color: textCellColor }]}>
                    {cellText}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginVertical: 4,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  headerRow: {
    borderBottomWidth: 1,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cellText: {
    fontSize: 12,
    fontWeight: '400',
  },
});
