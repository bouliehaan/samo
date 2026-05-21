import { Center } from '@mantine/core';
import { memo } from 'react';
import { CgSpinnerTwo } from 'react-icons/cg';
import styles from './spinner.module.css';
export const SpinnerIcon = CgSpinnerTwo;
const _Spinner = ({ ...props }) => {
    if (props.container) {
        return (<Center className={styles.container}>
                <SpinnerIcon className={styles.icon} color={props.color} size={props.size}/>
            </Center>);
    }
    return <SpinnerIcon className={styles.icon} color={props.color} size={props.size}/>;
};
_Spinner.displayName = 'Spinner';
export const Spinner = memo(_Spinner);
