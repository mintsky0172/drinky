export type CalendarCell = {
    date: Date;
    dateKey: string;
    inCurrentMonth: boolean;
    isToday: boolean;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export function toDateKey(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
        date.getDate(),
    )}`;
}

export function isSameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addDays(date: Date, amount: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

export function addMonths(date: Date, amount: number) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

/**
 * 월 캘린더용 6주(42칸) 배열 생성
 * 일요일 시작 기준
 * 앞/뒤 달 날짜 포함
 */

export function buildMonthCells(baseDate: Date): CalendarCell[] {
    const today = startOfDay(new Date());
    const firstDayOfMonth = startOfMonth(baseDate);

    // 일요일 시작 기준 : 0(일) ~ 6(토)
    const dayOfWeek = firstDayOfMonth.getDay();

    // 달력 첫 칸 날짜
    const gridStartDate = addDays(firstDayOfMonth, -dayOfWeek);

    return Array.from({length: 42}, (_, index) => {
        const date = addDays(gridStartDate, index);

        return {
            date,
            dateKey: toDateKey(date),
            inCurrentMonth: date.getMonth() === baseDate.getMonth(),
            isToday: isSameDay(date, today),
        };
    });
}

export function getMonthLabel(date: Date) {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export function getMonthRange(baseDate: Date) {
    const start = startOfMonth(baseDate);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);

    return {
        start,
        end,
        startKey: toDateKey(start),
        endKey: toDateKey(end),
    };
}

export const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]