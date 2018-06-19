module.exports = ({ define }) => {
  define('create', (payload, { context }) => {
    return {
      id: 1,
      title: payload.title,
      content: payload.content,
      userId: context.user.id
    }
  }, {
    auth: {
      role: 'admin'
    }
  })
}
