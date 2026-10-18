import React from 'react';
import { View, Text, TextInput, StyleSheet, Switch } from 'react-native';
import { COLORS, SIZES, FONTS } from '../../utils/theme';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  secureTextEntry?: boolean;
  required?: boolean;
}

export const FormField: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  secureTextEntry = false,
  required = false,
}) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.label}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <TextInput
      style={[styles.input, multiline && styles.multiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.gray}
      keyboardType={keyboardType}
      multiline={multiline}
      secureTextEntry={secureTextEntry}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
    />
  </View>
);

interface SwitchFieldProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({
  label,
  value,
  onValueChange,
}) => (
  <View style={styles.switchWrapper}>
    <Text style={styles.label}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: COLORS.primary, false: COLORS.border }}
    />
  </View>
);

const styles = StyleSheet.create({
  fieldWrapper: { marginTop: SIZES.md },
  label: {
    ...FONTS.small, color: COLORS.gray,
    marginBottom: 6, fontWeight: '600',
  },
  required: { color: COLORS.danger },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md, height: 48,
    ...FONTS.body, color: COLORS.dark,
  },
  multiline: { height: 90, paddingTop: SIZES.md, textAlignVertical: 'top' },
  switchWrapper: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: SIZES.md,
  },
});

export default { FormField, SwitchField };