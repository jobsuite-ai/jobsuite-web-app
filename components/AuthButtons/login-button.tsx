import classes from './Auth.module.css';

export const LoginButton = () => (
        <a className={classes.largeLink} href="/api/auth/login">
            Log In
        </a>
    );
