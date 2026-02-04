import { Redirect } from 'expo-router'
import 'react-native-url-polyfill/auto'


export default function Index() {
    // const [session, setSession] = useState<Session | null>(null)
    // useEffect(() => {
    //     supabase.auth.getSession().then(({ data: { session } }) => {
    //         setSession(session)
    //     })

    //     supabase.auth.onAuthStateChange((_event, session) => {
    //         setSession(session)
    //     })
    // }, [])

    // return (
    //     <View>
    //         <Auth />
    //         {session && session.user && <Text>{session.user.id}</Text>}
    //     </View>
    // )

    return <Redirect href="/(tabs)/home" />
}
