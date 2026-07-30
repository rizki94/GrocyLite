import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface MarkdownTableProps {
  content: string;
  isMe?: boolean;
  isDark?: boolean;
}

export function normalizeLines(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

export function isMarkdownTable(text: string): boolean {
  if (!text) return false;
  const lines = normalizeLines(text);
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith('|') && lines[i + 1].replace(/[\s|\-:]/g, '').length === 0) {
      return true;
    }
  }
  return false;
}

export function MarkdownTable({ content, isMe = false, isDark = false }: MarkdownTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { titleLines, headerRow, bodyRows, columnCount, colWidths } = React.useMemo(() => {
    const lines = normalizeLines(content);
    const titleLines = lines.filter(l => !l.startsWith('|'));
    const tableLines = lines.filter(l => l.startsWith('|'));

    if (tableLines.length < 2) {
      return { titleLines: [], headerRow: [], bodyRows: [], columnCount: 0, colWidths: [] };
    }

    const parseRow = (line: string) =>
      line.split('|').slice(1, -1).map(c => c.trim());

    const headerRow = parseRow(tableLines[0]);
    const isSeparator = (l: string) => /^\|[\s\-:|]+\|$/.test(l.replace(/\s+/g, ' '));
    const bodyRows = tableLines.slice(1).filter(l => !isSeparator(l)).map(parseRow);
    const columnCount = headerRow.length;

    // Calculate width for each column based on sample rows (max 50) for performance
    const colWidths: number[] = new Array(columnCount).fill(85);
    const sampleRows = [headerRow, ...bodyRows.slice(0, 50)];
    sampleRows.forEach(row => {
      row.forEach((cell, idx) => {
        if (idx < columnCount) {
          const estimatedWidth = Math.min(240, Math.max(85, cell.length * 8.5 + 24));
          if (estimatedWidth > colWidths[idx]) {
            colWidths[idx] = estimatedWidth;
          }
        }
      });
    });

    return { titleLines, headerRow, bodyRows, columnCount, colWidths };
  }, [content]);

  if (columnCount === 0 || bodyRows.length === 0) {
    return <Text style={{ color: isMe ? '#ffffff' : isDark ? '#ffffff' : '#09090b' }}>{content}</Text>;
  }

  const MAX_EXPAND_ROWS = 25; // Capped to prevent Android Native UI OOM/crash
  const hasMore = bodyRows.length > 5;
  const visibleRows = isExpanded
    ? bodyRows.slice(0, MAX_EXPAND_ROWS)
    : bodyRows.slice(0, 5);

  const totalHidden = bodyRows.length - visibleRows.length;

  const borderColor = isMe ? 'rgba(255,255,255,0.3)' : isDark ? '#3f3f46' : '#cbd5e1';
  const headerBg = isMe ? 'rgba(0,0,0,0.2)' : isDark ? '#27272a' : '#f1f5f9';
  const textHeaderColor = isMe ? '#ffffff' : isDark ? '#34d399' : '#059669';
  const textCellColor = isMe ? '#ffffff' : isDark ? '#f4f4f5' : '#0f172a';
  const titleColor = isMe ? '#ffffff' : isDark ? '#f4f4f5' : '#09090b';

  return (
    <View style={styles.container}>
      {/* Title lines above table */}
      {titleLines.length > 0 && (
        <Text style={[styles.titleText, { color: titleColor }]}>
          {titleLines.join('\n')}
        </Text>
      )}

      {/* Scrollable Table */}
      <View style={[styles.tableContainer, { borderColor }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.scroll}>
          <View>
            {/* Table Header */}
            <View style={[styles.row, styles.headerRow, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
              {headerRow.map((colText, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.cell,
                    { width: colWidths[idx] || 85 },
                    idx < columnCount - 1 && { borderRightWidth: 1, borderRightColor: borderColor },
                  ]}>
                  <Text style={[styles.headerText, { color: textHeaderColor }]} numberOfLines={2}>
                    {colText}
                  </Text>
                </View>
              ))}
            </View>

            {/* Table Body Rows */}
            {visibleRows.map((row, rIdx) => (
              <View
                key={rIdx}
                style={[
                  styles.row,
                  { backgroundColor: rIdx % 2 === 0 ? 'transparent' : (isMe ? 'rgba(0,0,0,0.06)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)') },
                  rIdx < visibleRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderColor },
                ]}>
                {Array.from({ length: columnCount }).map((_, cIdx) => {
                  const cellText = row[cIdx] || '';
                  return (
                    <View
                      key={cIdx}
                      style={[
                        styles.cell,
                        { width: colWidths[cIdx] || 85 },
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
      </View>

      {/* Read More / Collapse Toggle */}
      {hasMore && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsExpanded(prev => !prev)}
          style={[
            styles.toggleBtn,
            {
              borderColor: borderColor,
              backgroundColor: isMe ? 'rgba(0,0,0,0.15)' : isDark ? '#27272a' : '#f8fafc',
            },
          ]}>
          <Text style={[styles.toggleBtnText, { color: isMe ? '#ffffff' : '#059669' }]}>
            {isExpanded
              ? totalHidden > 0
                ? `Sembunyikan (Menampilkan 25 dari ${bodyRows.length} item) ▲`
                : 'Sembunyikan ▲'
              : `Lihat semua (+${bodyRows.length - 5} item) ▼`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    width: '100%',
  },
  titleText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 17,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 0,
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
    fontSize: 11,
    fontWeight: '700',
  },
  cellText: {
    fontSize: 11,
    fontWeight: '400',
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -1,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
