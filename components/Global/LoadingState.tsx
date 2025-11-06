import { Center, Loader } from '@mantine/core';

import classes from './LoadingState.module.css';

export default function LoadingState({ size = 'xl' }: { size?: string }) {
    return (
        <Center className={classes.container}>
            <Loader color="blue" className={classes.loader} size={size} />
        </Center>
    );
}
