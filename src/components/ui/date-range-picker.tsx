import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Calendar as CalendarIcon, X } from 'lucide-react-native';
import moment from 'moment';
import { cn } from '../../lib/utils';
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
  
  // Internal state for selection before saving
  const [selectedStart, setSelectedStart] = useState(moment(startDate).format('YYYY-MM-DD'));
  const [selectedEnd, setSelectedEnd] = useState(moment(endDate).format('YYYY-MM-DD'));

  const markedDates = useMemo(() => {
    if (!selectedStart) return {};
    
    let marked: any = {};
    const start = moment(selectedStart);
    const end = selectedEnd ? moment(selectedEnd) : null;

    marked[selectedStart] = {
      startingDay: true,
      endingDay: !selectedEnd || selectedStart === selectedEnd,
      color: colors.primary,
      textColor: 'white',
      selected: true
    };

    if (end && end.isAfter(start)) {
      let current = start.clone().add(1, 'days');
      while (current.isBefore(end)) {
        const dateStr = current.format('YYYY-MM-DD');
        marked[dateStr] = {
          color: colors.primary + '20',
          textColor: colors.primary,
        };
        current.add(1, 'days');
      }
      
      marked[selectedEnd] = {
        endingDay: true,
        color: colors.primary,
        textColor: 'white',
        selected: true
      };
    }

    return marked;
  }, [selectedStart, selectedEnd, colors.primary]);

  const onDayPress = (day: any) => {
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(day.dateString);
      setSelectedEnd('');
    } else {
      if (moment(day.dateString).isBefore(selectedStart)) {
        setSelectedStart(day.dateString);
        setSelectedEnd('');
      } else {
        setSelectedEnd(day.dateString);
      }
    }
  };

  const handleSave = () => {
    if (selectedStart) {
      const start = moment(selectedStart).toDate();
      const end = selectedEnd ? moment(selectedEnd).toDate() : start;
      onChange(start, end);
    }
    setShow(false);
  };

  const formattedLabel = useMemo(() => {
    const start = moment(selectedStart).format('MMM DD');
    const end = selectedEnd ? moment(selectedEnd).format('MMM DD') : '...';
    return `${start} — ${end}`;
  }, [selectedStart, selectedEnd]);

  return (
    <View className={cn('w-full', className)}>
      <TouchableOpacity
        onPress={() => {
            setSelectedStart(moment(startDate).format('YYYY-MM-DD'));
            setSelectedEnd(moment(endDate).format('YYYY-MM-DD'));
            setShow(true);
        }}
        activeOpacity={0.8}
        className="flex-row items-center border border-border bg-card rounded-md px-3 py-2.5 shadow-sm"
      >
        <CalendarIcon size={16} color={colors.mutedForeground} />
        <View className="flex-row items-center ml-2 flex-1">
          <Text className="text-[13px] font-medium text-foreground">
            {moment(startDate).format('MMM DD, YYYY')} — {moment(endDate).format('MMM DD, YYYY')}
          </Text>
        </View>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="fade">
        <Pressable 
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => setShow(false)}
        >
          <Pressable className="bg-card w-full max-w-sm rounded-2xl overflow-hidden border border-border shadow-2xl">
            <View className="px-5 py-4 flex-row items-center justify-between border-b border-border bg-primary/5">
              <View>
                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Range</Text>
                <Text className="text-lg font-bold text-primary">{formattedLabel}</Text>
              </View>
              <TouchableOpacity onPress={() => setShow(false)} className="p-2 bg-secondary/50 rounded-full">
                <X size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View className="p-2">
              <Calendar
                markingType={'period'}
                markedDates={markedDates}
                onDayPress={onDayPress}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  textSectionTitleColor: colors.mutedForeground,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: colors.primary,
                  dayTextColor: colors.foreground,
                  textDisabledColor: colors.mutedForeground + '50',
                  dotColor: colors.primary,
                  selectedDotColor: '#ffffff',
                  monthTextColor: colors.foreground,
                  textMonthFontWeight: 'black',
                  textDayHeaderFontWeight: 'bold',
                  textDayFontSize: 13,
                  textMonthFontSize: 15,
                  textDayHeaderFontSize: 11,
                }}
              />
            </View>

            <View className="px-5 py-4 border-t border-border bg-card flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setShow(false)}
                className="flex-1 py-3 rounded-xl items-center bg-secondary/50"
              >
                <Text className="font-bold text-muted-foreground">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSave}
                className="flex-1 py-3 rounded-xl items-center bg-primary"
              >
                <Text className="font-bold text-white">Apply Range</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
