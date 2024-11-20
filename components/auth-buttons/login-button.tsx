import classes from '../Shell/Header/Header.module.css';

export const LoginButton = () => {
    return (
        <a className={classes.link} href="/api/auth/login">
            Log In
        </a>
    );
};
