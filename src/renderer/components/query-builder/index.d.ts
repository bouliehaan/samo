export type FilterGroup = {
    group: string;
    items: FilterItem[];
};
export type FilterItem = {
    label: string;
    type: string;
    value: string;
};
export type Filters = FilterGroup[] | FilterItem[];
type AddArgs = {
    groupIndex: number[];
    level: number;
};
type DeleteArgs = {
    groupIndex: number[];
    level: number;
    uniqueId: string;
};
interface QueryBuilderProps {
    data: Record<string, any>;
    filters: Filters;
    groupIndex: number[];
    level: number;
    onAddRule: (args: AddArgs) => void;
    onAddRuleGroup: (args: AddArgs) => void;
    onChangeField: (args: any) => void;
    onChangeOperator: (args: any) => void;
    onChangeType: (args: any) => void;
    onChangeValue: (args: any) => void;
    onClearFilters: () => void;
    onDeleteRule: (args: DeleteArgs) => void;
    onDeleteRuleGroup: (args: DeleteArgs) => void;
    onResetFilters: () => void;
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
        playlist: {
            label: string;
            value: string;
        }[];
        string: {
            label: string;
            value: string;
        }[];
    };
    playlists?: {
        label: string;
        value: string;
    }[];
    saveActions?: React.ReactNode;
    uniqueId: string;
}
export declare const QueryBuilder: ({ data, filters, groupIndex, level, onAddRule, onAddRuleGroup, onChangeField, onChangeOperator, onChangeType, onChangeValue, onClearFilters, onDeleteRule, onDeleteRuleGroup, onResetFilters, operators, playlists, saveActions, uniqueId, }: QueryBuilderProps) => import("react/jsx-runtime").JSX.Element;
export {};
