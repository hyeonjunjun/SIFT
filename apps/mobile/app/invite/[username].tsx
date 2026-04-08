import { Redirect, useLocalSearchParams } from 'expo-router';

export default function InviteRedirect() {
    const { username } = useLocalSearchParams<{ username: string }>();
    return <Redirect href={`/user/${username}`} />;
}
