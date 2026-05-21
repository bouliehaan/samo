import { Filters } from '/@/renderer/components/query-builder';
import { QueryBuilderRule } from '/@/shared/types/types';
type DeleteArgs = {
    groupIndex: number[];
    level: number;
    uniqueId: string;
};
interface QueryOptionProps {
    data: QueryBuilderRule;
    filters: Filters;
    groupIndex: number[];
    level: number;
    noRemove: boolean;
    onChangeField: (args: any) => void;
    onChangeOperator: (args: any) => void;
    onChangeValue: (args: any) => void;
    onDeleteRule: (args: DeleteArgs) => void;
    operators: {
        boolean: {
            label: string;
            value: string;
        }[];
        date: {
            label: string;
            value: string;
        }[];
        number: {
            label: string;
            value: string;
        }[];
        string: {
            label: string;
            value: string;
        }[];
    };
    selectData?: {
        label: string;
        value: string;
    }[];
}
export declare const QueryBuilderOption: ({ data, filters, groupIndex, level, noRemove, onChangeField, onChangeOperator, onChangeValue, onDeleteRule, operators, selectData, }: QueryOptionProps) => import("react/jsx-runtime").JSX.Element;
export {};
