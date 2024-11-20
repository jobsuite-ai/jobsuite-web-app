import classes from './Auth.module.css';

export const SignupButton = () => {
    return (
        <a className={classes.largeLink} href="/api/auth/signup">
            Sign Up
        </a>
    );
};
