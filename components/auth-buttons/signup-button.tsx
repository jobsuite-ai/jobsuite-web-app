import classes from '../Shell/Header/Header.module.css';

export const SignupButton = () => {
    return (
        <a className={classes.link} href="/api/auth/signup">
            Sign Up
        </a>
    );
};
