import { Loader } from '@mantine/core';

import classes from './LoadingState.module.css';

export default function LoadingState({ size = 'xl' }: { size?: string }) {
    return (<Loader color="blue" className={classes.loader} size={size} mt={size} mb={size} />);
}
