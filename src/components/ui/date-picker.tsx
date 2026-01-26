import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import moment from 'moment';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { useThemeColor } from '../../lib/colors';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder,
  className,
}: DatePickerProps) {
  const colors = useThemeColor();
  const [show, setShow] = useState(false);

  // Android handler
  const onChangeAndroid = (event: any, selectedDate?: Date) => {
    setShow(false);
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
    }
  };

  // iOS handler (often presented in a modal or inline, keeping it simple for now)
  const onChangeIOS = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <View className={cn('w-full', className)}>
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-foreground">
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => setShow(true)}
        className="flex-row items-center justify-between rounded-lg border border-input bg-background px-3 py-2.5"
        activeOpacity={0.7}
      >
        <Text
          className={cn('text-foreground', !value && 'text-muted-foreground')}
        >
          {value
            ? moment(value).format('DD MMMM YYYY')
            : placeholder || 'Select date'}
        </Text>
        <Calendar size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {show &&
        (Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={show}>
            <View className="flex-1 justify-end bg-black/50">
              <View className="bg-background p-4 rounded-t-3xl">
                <View className="flex-row justify-between items-center mb-4 border-b border-border/50 pb-2">
                  <Button
                    variant="ghost"
                    label="Cancel"
                    onPress={() => setShow(false)}
                  />
                  <Text className="font-bold text-lg">Select Date</Text>
                  <Button
                    variant="default"
                    label="Done"
                    onPress={() => setShow(false)}
                  />
                </View>
                <DateTimePicker
                  testID="dateTimePicker"
                  value={value || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={onChangeIOS}
                  style={{ width: '100%', height: 200 }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            testID="dateTimePicker"
            value={value || new Date()}
            mode="date"
            display="default"
            onChange={onChangeAndroid}
          />
        ))}
    </View>
  );
}
