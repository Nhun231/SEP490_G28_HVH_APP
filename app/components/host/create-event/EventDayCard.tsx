import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DatePickerInput from './DatePickerInput';
import TimePickerInput from './TimePickerInput';
import QuantityInputField from './QuantityInputField';

export interface EventDay {
    id: string;
    date?: Date;
    startTime?: Date;
    endTime?: Date;
    volunteerCount: string;
    servedCount: string;
}

export type DayErrorField = 'date' | 'startTime' | 'endTime' | 'volunteerCount' | 'servedCount';

type DayErrors = Partial<Record<DayErrorField, string>>;

interface EventDayCardProps {
    day: EventDay;
    index: number;
    totalDays: number;
    errors?: DayErrors;
    todayStart: Date;
    onRemove: (id: string) => void;
    onUpdateDay: (id: string, field: keyof EventDay, value: any) => void;
    onSetDayFieldError: (id: string, field: DayErrorField, message?: string) => void;
    onValidateQuantity: (id: string, field: 'volunteerCount' | 'servedCount', value: string, emptyMessage: string) => void;
    sanitizeVolunteerInput: (value: string) => string;
    sanitizeServedInput: (value: string) => string;
}

export default function EventDayCard({
    day,
    index,
    totalDays,
    errors = {},
    todayStart,
    onRemove,
    onUpdateDay,
    onSetDayFieldError,
    onValidateQuantity,
    sanitizeVolunteerInput,
    sanitizeServedInput,
}: EventDayCardProps) {
    return (
        <View style={styles.dayCard}>
            {/* Header */}
            <View style={styles.dayCardHeader}>
                <Text style={styles.dayCardTitle}>Ngày {index + 1}</Text>
                {totalDays > 1 && (
                    <TouchableOpacity onPress={() => onRemove(day.id)} style={styles.trashBtn}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Ngày tổ chức */}
            <DatePickerInput
                label="Ngày tổ chức"
                required
                value={day.date}
                error={errors.date}
                onDismiss={() =>
                    onSetDayFieldError(day.id, 'date', day.date ? undefined : 'Vui lòng chọn ngày tổ chức')
                }
                onChange={(date) => onUpdateDay(day.id, 'date', date)}
                placeholder="Vui lòng chọn ngày diễn ra sự kiện"
                minimumDate={todayStart}
            />
            <Text style={styles.fieldHintNeg}>
                Ngày tổ chức phải sau ngày tạo sư kiện ít nhất 15 ngày
            </Text>
            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}

            {/* Giờ bắt đầu & Kết thúc */}
            <View style={{ marginBottom: 0 }}>
                <View style={styles.timeRow}>
                    <View style={styles.halfCol}>
                        <TimePickerInput
                            label="Giờ bắt đầu"
                            required
                            value={day.startTime}
                            error={errors.startTime}
                            onDismiss={() =>
                                onSetDayFieldError(day.id, 'startTime', day.startTime ? undefined : 'Vui lòng chọn giờ bắt đầu')
                            }
                            onChange={(time) => onUpdateDay(day.id, 'startTime', time)}
                            placeholder="Chọn giờ"
                        />
                    </View>
                    <View style={styles.halfCol}>
                        <TimePickerInput
                            label="Giờ kết thúc"
                            required
                            value={day.endTime}
                            error={errors.endTime}
                            onDismiss={() =>
                                onSetDayFieldError(day.id, 'endTime', day.endTime ? undefined : 'Vui lòng chọn giờ kết thúc')
                            }
                            onChange={(time) => onUpdateDay(day.id, 'endTime', time)}
                            placeholder="Chọn giờ"
                        />
                    </View>
                </View>
                <Text style={styles.fieldHintNeg}>
                    Giờ bắt đầu và kết thúc phải nằm trong khoảng 5:00 đến 23:00
                </Text>
                {errors.startTime && (
                    <Text style={styles.errorText}>{errors.startTime}</Text>
                )}
                {!errors.startTime && errors.endTime && (
                    <Text style={styles.errorText}>{errors.endTime}</Text>
                )}
            </View>

            {/* Số lượng TNV */}
            <QuantityInputField
                label="Số lượng TNV cần tuyển"
                required
                icon="people-outline"
                value={day.volunteerCount}
                error={errors.volunteerCount}
                onBlur={() =>
                    onValidateQuantity(day.id, 'volunteerCount', day.volunteerCount, 'Vui lòng nhập số lượng TNV cần tuyển')
                }
                onChangeText={(text) =>
                    onUpdateDay(day.id, 'volunteerCount', sanitizeVolunteerInput(text))
                }
            />

            {/* Số lượng đối tượng phục vụ */}
            <QuantityInputField
                label="Số lượng đối tượng phục vụ"
                required
                icon="heart-outline"
                value={day.servedCount}
                error={errors.servedCount}
                wrapperStyle={{ marginBottom: 0 }}
                onBlur={() =>
                    onValidateQuantity(day.id, 'servedCount', day.servedCount, 'Vui lòng nhập số lượng đối tượng phục vụ')
                }
                onChangeText={(text) =>
                    onUpdateDay(day.id, 'servedCount', sanitizeServedInput(text))
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    dayCard: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dayCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dayCardTitle: {
        color: '#374151',
        fontWeight: '700',
        fontSize: 14,
    },
    trashBtn: {
        padding: 4,
    },
    timeRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 0,
    },
    halfCol: {
        flex: 1,
    },
    fieldHintNeg: {
        color: '#9CA3AF',
        fontSize: 11,
        marginTop: -10,
        marginBottom: 4,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 11,
        marginTop: 2,
    },
});
