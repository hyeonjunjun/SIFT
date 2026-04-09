import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '../design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS } from '../../lib/theme';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface MonthViewProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    mealCountByDate: Record<string, number>;
    weekStartsMonday?: boolean;
}

function formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function MonthView({ selectedDate, onSelectDate, mealCountByDate, weekStartsMonday = false }: MonthViewProps) {
    const { colors, isDark } = useTheme();
    const [viewMonth, setViewMonth] = React.useState(selectedDate.getMonth());
    const [viewYear, setViewYear] = React.useState(selectedDate.getFullYear());

    const dayLabels = weekStartsMonday
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const calendarDays = React.useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const lastDay = new Date(viewYear, viewMonth + 1, 0);
        let startDayOfWeek = firstDay.getDay();
        if (weekStartsMonday) {
            startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        }

        const days: (Date | null)[] = [];
        // Padding for days before month starts
        for (let i = 0; i < startDayOfWeek; i++) days.push(null);
        // Days of the month
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(viewYear, viewMonth, d));
        }
        // Padding to fill last row
        while (days.length % 7 !== 0) days.push(null);
        return days;
    }, [viewMonth, viewYear, weekStartsMonday]);

    const today = formatDateKey(new Date());
    const selectedKey = formatDateKey(selectedDate);

    const prevMonth = () => {
        Haptics.selectionAsync();
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };

    const nextMonth = () => {
        Haptics.selectionAsync();
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    return (
        <View style={styles.container}>
            {/* Month header */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} hitSlop={12}>
                    <CaretLeft size={18} color={colors.ink} weight="bold" />
                </TouchableOpacity>
                <Typography variant="label" style={{ fontSize: 15, letterSpacing: 0.5 }}>
                    {MONTH_NAMES[viewMonth]} {viewYear}
                </Typography>
                <TouchableOpacity onPress={nextMonth} hitSlop={12}>
                    <CaretRight size={18} color={colors.ink} weight="bold" />
                </TouchableOpacity>
            </View>

            {/* Day labels */}
            <View style={styles.dayLabelRow}>
                {dayLabels.map(d => (
                    <View key={d} style={styles.dayLabelCell}>
                        <Typography variant="caption" color="stone" style={{ fontSize: 10, letterSpacing: 0.5 }}>
                            {d.toUpperCase()}
                        </Typography>
                    </View>
                ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
                {calendarDays.map((date, i) => {
                    if (!date) return <View key={`empty-${i}`} style={styles.cell} />;

                    const key = formatDateKey(date);
                    const isSelected = key === selectedKey;
                    const isToday = key === today;
                    const count = mealCountByDate[key] || 0;

                    return (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.cell,
                                isSelected && { backgroundColor: colors.ink, borderRadius: RADIUS.s },
                                isToday && !isSelected && { borderWidth: 1, borderColor: colors.ink, borderRadius: RADIUS.s },
                            ]}
                            onPress={() => { Haptics.selectionAsync(); onSelectDate(date); }}
                        >
                            <Typography
                                variant="caption"
                                style={[
                                    styles.cellText,
                                    { color: isSelected ? colors.paper : colors.ink },
                                    date.getMonth() !== viewMonth && { opacity: 0.3 },
                                ]}
                            >
                                {date.getDate()}
                            </Typography>
                            {count > 0 && (
                                <View style={styles.dotRow}>
                                    {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                                        <View key={di} style={[styles.dot, { backgroundColor: isSelected ? colors.paper : colors.accent }]} />
                                    ))}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.l,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    dayLabelRow: {
        flexDirection: 'row',
        marginBottom: SPACING.s,
    },
    dayLabelCell: {
        flex: 1,
        alignItems: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
    },
    cellText: {
        fontSize: 14,
        fontWeight: '500',
    },
    dotRow: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 2,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
});
