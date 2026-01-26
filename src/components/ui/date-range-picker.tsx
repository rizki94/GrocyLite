import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar as CalendarIcon, ChevronRight } from 'lucide-react-native';
import moment from 'moment';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { useThemeColor } from '../../lib/colors';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date) => void;
  label?: string;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  label,
  className,
}: DateRangePickerProps) {
  const colors = useThemeColor();
  const [show, setShow] = useState(false);
  const [activePicker, setActivePicker] = useState<'start' | 'end'>('start');

  const onDateChange = (event: any, selectedDate?: Date) => {
    // Android auto-closes on selection
    if (Platform.OS === 'android') {
      setShow(false);
    }

    if (selectedDate) {
      if (activePicker === 'start') {
        onChange(selectedDate, endDate);
      } else {
        onChange(startDate, selectedDate);
      }
    }
  };

  const formatDate = (date: Date) => moment(date).format('MMM DD, YYYY');

  return (
    <View className={cn('w-full', className)}>
      {label && (
        <Text className="mb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </Text>
      )}

      {/* Shadcn-style Trigger Button */}
      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.8}
        className="flex-row items-center border border-border bg-card rounded-md px-3 py-2.5 shadow-sm"
      >
        <CalendarIcon size={16} color={colors.mutedForeground} />
        <View className="flex-row items-center ml-2 flex-1">
          <Text className="text-[13px] font-medium text-foreground">
            {formatDate(startDate)}
          </Text>
          <Text className="mx-2 text-muted-foreground text-[10px]">—</Text>
          <Text className="text-[13px] font-medium text-foreground">
            {formatDate(endDate)}
          </Text>
        </View>
      </TouchableOpacity>

      {show && (
        <Modal transparent animationType="fade" visible={show}>
          <View className="flex-1 justify-center p-4 bg-black/60">
            <View className="bg-card rounded-2xl overflow-hidden border border-border">
              {/* Modal Header */}
              <View className="p-4 border-b border-border bg-secondary/5">
                <Text className="text-center font-bold text-base text-foreground">
                  Select Date Range
                </Text>
              </View>

              {/* Range Selection Toggle */}
              <View className="flex-row p-4 gap-3">
                <TouchableOpacity
                  onPress={() => setActivePicker('start')}
                  className={cn(
                    'flex-1 p-3 rounded-xl border border-transparent items-center',
                    activePicker === 'start'
                      ? 'bg-primary/10 border-primary'
                      : 'bg-secondary/20',
                  )}
                >
                  <Text className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Start Date
                  </Text>
                  <Text
                    className={cn(
                      'font-bold text-sm',
                      activePicker === 'start'
                        ? 'text-primary'
                        : 'text-foreground',
                    )}
                  >
                    {formatDate(startDate)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActivePicker('end')}
                  className={cn(
                    'flex-1 p-3 rounded-xl border border-transparent items-center',
                    activePicker === 'end'
                      ? 'bg-primary/10 border-primary'
                      : 'bg-secondary/20',
                  )}
                >
                  <Text className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    End Date
                  </Text>
                  <Text
                    className={cn(
                      'font-bold text-sm',
                      activePicker === 'end'
                        ? 'text-primary'
                        : 'text-foreground',
                    )}
                  >
                    {formatDate(endDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Picker Area */}
              <View className="px-4 pb-4">
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={
                      (activePicker === 'start' ? startDate : endDate) ||
                      new Date()
                    }
                    mode="date"
                    display="inline"
                    onChange={onDateChange}
                    accentColor={colors.primary}
                    style={{ height: 320 }}
                  />
                ) : (
                  <View className="py-10 items-center justify-center border border-dashed border-border rounded-xl">
                    <Button
                      label={`Pick ${activePicker === 'start' ? 'Start' : 'End'} Date`}
                      variant="outline"
                      onPress={() => {
                        // For Android we trigger the picker directly since 'inline' isn't supported the same way
                        // The modal stays open to show the range, but the native picker pops up
                      }}
                      // Actually better to just auto-trigger or use a better display
                    />
                    <Text className="text-xs text-muted-foreground mt-2">
                      Click to open system calendar
                    </Text>
                  </View>
                )}
              </View>

              {/* Footer Actions */}
              <View className="flex-row p-4 border-t border-border gap-3">
                <Button
                  label="Done"
                  className="flex-1"
                  onPress={() => setShow(false)}
                />
              </View>
            </View>
          </View>

          {/* Native Picker Trigger for Android */}
          {Platform.OS === 'android' && show && (
            <DateTimePicker
              value={
                (activePicker === 'start' ? startDate : endDate) || new Date()
              }
              mode="date"
              display="default"
              onChange={(e, d) => {
                if (e.type === 'set' && d) {
                  if (activePicker === 'start') {
                    onChange(d, endDate);
                    setActivePicker('end'); // Auto-switch to end for better flow
                  } else {
                    onChange(startDate, d);
                    setShow(false); // Close on end date selection
                  }
                } else {
                  setShow(false);
                }
              }}
            />
          )}
        </Modal>
      )}
    </View>
  );
}
