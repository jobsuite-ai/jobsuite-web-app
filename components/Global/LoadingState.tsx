import { Loader } from '@mantine/core';
import classes from './LoadingState.module.css';

export default function LoadingState() {
    return (<Loader color="blue" className={classes.loader} size="xl" />);
}
