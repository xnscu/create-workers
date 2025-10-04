import { timeParser } from '~/lib/utils'
import { useSession, getAnonymousSession, removeSession } from '~/composables/useSession'

const LIFETIME_SECONDS = timeParser(process.env.COOKIE_EXPIRES || '300d')

const session = useSession()

function login({ user, roles }) {
  if (user) {
    session.user = user
  }
  if (roles) {
    session.roles = roles
  }
  session.expire = LIFETIME_SECONDS * 1000 + new Date().getTime()
  const sessionStr = JSON.stringify({
    user: session.user,
    roles: session.roles,
    expire: session.expire,
  })
  localStorage.setItem('session', sessionStr)
}

// 新增：处理从URL参数传递的session数据
function loginFromSessionData(sessionData) {
  if (sessionData.session?.user) {
    session.user = sessionData.session.user
  }
  if (sessionData.session?.roles) {
    session.roles = sessionData.session.roles
  }

  // 设置cookie_session
  if (sessionData.cookie_session) {
    document.cookie = `session=${sessionData.cookie_session}; path=/; max-age=${LIFETIME_SECONDS}`
  }

  session.expire = LIFETIME_SECONDS * 1000 + new Date().getTime()
  const sessionStr = JSON.stringify({
    user: session.user,
    roles: session.roles,
    expire: session.expire,
  })
  localStorage.setItem('session', sessionStr)
}

function logout() {
  session.user = getAnonymousSession().user
  session.roles = {}
  removeSession()
}

export const useUser = () => {
  const { user } = useSession()
  return user
}

export const useRoles = () => {
  const { roles } = useSession()
  return roles
}

export const updateSession = async () => {
  if (!useUser().id) {
    return
  }
  try {
    const { roles, user } = await usePost('/user/update_session')
    if (roles && user) {
      login({ roles, user })
    }
  } catch (error) {
    console.error('update_session failed:', error)
  }
}

export default () => {
  return {
    session,
    login,
    loginFromSessionData,
    logout,
    updateSession,
  }
}
